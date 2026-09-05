import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  getDoc,
  onSnapshot,
  updateDoc
} from 'firebase/firestore';

// Defina aqui o e-mail que terá privilégios de Administrador
const ADMIN_EMAIL = "francisco@admin.com";

// Inserção dinâmica segura do Favicon
try {
  const faviconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#ff5722"/>
      <text x="32" y="47" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="46" font-weight="900" fill="#ffffff" text-anchor="middle">⚡</text>
    </svg>`;
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(faviconSvg);
  document.head.appendChild(link);
} catch (e) {}

const style = document.createElement('style');
style.innerHTML = `
  body {
    background-color: #121212;
    color: #ffffff;
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(120, 119, 116, 0.3);
    border-radius: 3px;
  }

  /* Estilo do Botão Estilo MyInstants (Esférico / 3D com Brilho de Gel e Animação de Aperto) */
  .instant-btn {
    width: 105px;
    height: 105px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 12px;
    font-size: 13px;
    font-weight: bold;
    color: #fff;
    word-break: break-word;
    outline: none;
    user-select: none;
    box-shadow: 
      inset 0 6px 12px rgba(255, 255, 255, 0.4), 
      inset 0 -8px 12px rgba(0, 0, 0, 0.6), 
      0 8px 16px rgba(0, 0, 0, 0.5);
    transition: transform 0.08s ease, box-shadow 0.08s ease;
  }

  .instant-btn::before {
    content: '';
    position: absolute;
    top: 6px;
    left: 15px;
    right: 15px;
    height: 38px;
    background: linear-gradient(to bottom, rgba(255,255,255,0.45), rgba(255,255,255,0.05));
    border-radius: 50% 50% 40% 40%;
    pointer-events: none;
  }

  .instant-btn:active {
    transform: scale(0.92) translateY(4px);
    box-shadow: 
      inset 0 3px 6px rgba(255, 255, 255, 0.2), 
      inset 0 -3px 6px rgba(0, 0, 0, 0.8), 
      0 2px 6px rgba(0, 0, 0, 0.4);
  }
`;
document.head.appendChild(style);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Erro capturado:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#191919', color: '#eb5757', fontFamily: 'sans-serif', minHeight: '100vh', boxSizing: 'border-box' }}>
          <h2>Ocorreu um erro ao carregar a aplicação.</h2>
          <pre style={{ background: '#262626', padding: '15px', borderRadius: '5px', overflowX: 'auto', color: '#f4f4f0' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [sons, setSons] = useState([]);
  const [sonsPendentes, setSonsPendentes] = useState([]);
  const [termoBusca, setTermoBusca] = useState('');
  
  // Modais
  const [modalNovoSom, setModalNovoSom] = useState(false);
  const [modalLogin, setModalLogin] = useState(false);
  const [modalAprovacao, setModalAprovacao] = useState(false);

  const [novoTitulo, setNovoTitulo] = useState('');
  const [urlAudio, setUrlAudio] = useState('');
  const [novaCor, setNovaCor] = useState('#ff5722');
  const [enviando, setEnviando] = useState(false);

  // Campos de Login do Admin
  const [emailInput, setEmailInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [erroLogin, setErroLogin] = useState('');

  // Estados de Gravação de Áudio
  const [gravando, setGravando] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(5);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const currentAudioRef = useRef(null);

  useEffect(() => {
    try {
      if (!auth) return;
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user && user.email) {
          setUsuarioLogado(user.email);
        } else {
          setUsuarioLogado(null);
        }
      });
      return () => unsubscribe();
    } catch (e) {}
  }, []);

  // Ouve os sons aprovados (públicos)
  useEffect(() => {
    if (db) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'myinstants_sons'), (snapshot) => {
          const lista = [];
          snapshot.forEach((docSnap) => {
            lista.push({ id: docSnap.id, ...docSnap.data() });
          });
          setSons(lista);
        });
        return () => unsubscribe();
      } catch (e) {}
    }
  }, []);

  // Ouve os sons pendentes (visível apenas para o admin)
  useEffect(() => {
    if (db && usuarioLogado === ADMIN_EMAIL) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'myinstants_pendentes'), (snapshot) => {
          const lista = [];
          snapshot.forEach((docSnap) => {
            lista.push({ id: docSnap.id, ...docSnap.data() });
          });
          setSonsPendentes(lista);
        });
        return () => unsubscribe();
      } catch (e) {}
    } else {
      setSonsPendentes([]);
    }
  }, [usuarioLogado]);

  const reproduzirSom = async (id, audioUrl, playsAtuais) => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }

      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.play().catch(err => console.log("Erro ao tocar áudio:", err));

      const novoPlays = (playsAtuais || 0) + 1;
      await updateDoc(doc(db, 'myinstants_sons', id), { plays: novoPlays });
    } catch (e) {
      console.error(e);
    }
  };

  const excluirSom = async (id, titulo) => {
    if (window.confirm(`Deseja realmente excluir o botão "${titulo}"?`)) {
      try {
        await deleteDoc(doc(db, 'myinstants_sons', id));
      } catch (e) {
        alert("Erro ao excluir som: " + e.message);
      }
    }
  };

  // Aprovar som pendente
  const aprovarSom = async (som) => {
    try {
      // Adiciona na coleção oficial de aprovados
      await setDoc(doc(db, 'myinstants_sons', som.id), {
        titulo: som.titulo,
        audioUrl: som.audioUrl,
        cor: som.cor,
        plays: 0,
        criadoEm: som.criadoEm || Date.now()
      });
      // Remove da coleção de pendentes
      await deleteDoc(doc(db, 'myinstants_pendentes', som.id));
    } catch (e) {
      alert("Erro ao aprovar som: " + e.message);
    }
  };

  // Rejeitar som pendente
  const rejeitarSom = async (id) => {
    if (window.confirm("Deseja rejeitar e apagar este envio?")) {
      try {
        await deleteDoc(doc(db, 'myinstants_pendentes', id));
      } catch (e) {
        alert("Erro ao rejeitar som: " + e.message);
      }
    }
  };

  const handleLoginAdmin = async (e) => {
    e.preventDefault();
    setErroLogin('');
    try {
      const result = await signInWithEmailAndPassword(auth, emailInput, senhaInput);
      setUsuarioLogado(result.user.email);
      setModalLogin(false);
      setEmailInput('');
      setSenhaInput('');
    } catch (e) {
      setErroLogin('E-mail ou senha incorretos.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUsuarioLogado(null);
    } catch (e) {}
  };

  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setUrlAudio(reader.result);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setGravando(true);
      setTempoRestante(5);

      let segundos = 5;
      timerRef.current = setInterval(() => {
        segundos -= 1;
        setTempoRestante(segundos);
        if (segundos <= 0) {
          clearInterval(timerRef.current);
          mediaRecorder.stop();
          setGravando(false);
        }
      }, 1000);

    } catch (e) {
      alert("Erro ao acessar o microfone.");
      setGravando(false);
    }
  };

  // Visitantes enviam para a aba de pendentes; Admin publica direto ou gerencia
  const enviarNovoSom = async () => {
    if (!novoTitulo.trim() || !urlAudio.trim()) {
      alert("Preencha o título e insira uma URL ou grave um áudio.");
      return;
    }

    setEnviando(true);
    try {
      const novoId = Date.now().toString();
      const dadosSom = {
        titulo: novoTitulo.trim(),
        audioUrl: urlAudio.trim(),
        cor: novaCor,
        criadoEm: Date.now()
      };

      if (usuarioLogado === ADMIN_EMAIL) {
        // Se for o admin, vai direto para o ar
        await setDoc(doc(db, 'myinstants_sons', novoId), { ...dadosSom, plays: 0 });
        alert("Som adicionado com sucesso!");
      } else {
        // Se for visitante, vai para a aba de moderação/pendentes
        await setDoc(doc(db, 'myinstants_pendentes', novoId), dadosSom);
        alert("Som enviado para análise do Administrador!");
      }

      setModalNovoSom(false);
      setNovoTitulo('');
      setUrlAudio('');
    } catch (e) {
      alert("Erro ao enviar som: " + e.message);
    } finally {
      setEnviando(false);
    }
  };

  const isAdmin = usuarioLogado === ADMIN_EMAIL;
  const sonsFiltrados = sons.filter(s => s.titulo.toLowerCase().includes(termoBusca.toLowerCase()));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: '#fff', padding: '20px', boxSizing: 'border-box' }}>
      
      <header style={{ textAlign: 'center', marginBottom: '30px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', gap: '10px' }}>
          {isAdmin && sonsPendentes.length > 0 && (
            <button 
              onClick={() => setModalAprovacao(true)}
              style={{ background: '#ff9800', border: 'none', color: '#000', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
            >
              🔔 Aprovação ({sonsPendentes.length})
            </button>
          )}

          {isAdmin ? (
            <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #ff5722', color: '#ff5722', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Sair (Admin)
            </button>
          ) : (
            <button onClick={() => setModalLogin(true)} style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
              Entrar como Admin
            </button>
          )}
        </div>

        <h1 style={{ color: '#ff5722', fontSize: '32px', margin: '0 0 5px 0' }}>MyInstants</h1>
        <p style={{ color: '#888', margin: 0, fontSize: '14px' }}>Os melhores botões de som da internet em tempo real</p>
      </header>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '35px', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Pesquisar som..." 
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          style={{ width: '100%', maxWidth: '450px', padding: '12px 20px', fontSize: '16px', borderRadius: '30px', border: '1px solid #333', backgroundColor: '#1e1e1e', color: '#fff', outline: 'none' }}
        />
        <button 
          onClick={() => setModalNovoSom(true)}
          style={{ padding: '0 24px', backgroundColor: '#ff5722', color: '#fff', border: 'none', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 10px rgba(255,87,34,0.3)' }}
        >
          + Adicionar Som
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '25px', maxWidth: '1200px', margin: '0 auto', justifyItems: 'center' }}>
        {sonsFiltrados.map((item) => (
          <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '140px' }}>
            
            {isAdmin && (
              <button 
                onClick={() => excluirSom(item.id, item.titulo)}
                title="Excluir botão"
                style={{ position: 'absolute', top: '0px', right: '10px', background: 'rgba(235, 87, 87, 0.2)', border: 'none', color: '#eb5757', width: '26px', height: '26px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', zIndex: 2 }}
              >
                ✕
              </button>
            )}

            <button 
              className="instant-btn"
              onClick={() => reproduzirSom(item.id, item.audioUrl, item.plays)}
              style={{ backgroundColor: item.cor || '#ff5722', marginTop: '6px' }}
            >
              <span style={{ position: 'relative', zIndex: 1 }}>{item.titulo}</span>
            </button>

            <div style={{ fontSize: '14px', textAlign: 'center', margin: '10px 0 2px 0', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
              {item.titulo}
            </div>
            <div style={{ fontSize: '11px', color: '#888', textAlign: 'center' }}>
              Reproduções: {item.plays || 0}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE APROVAÇÃO (EXCLUSIVO ADMIN) */}
      {modalAprovacao && isAdmin && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '15px', boxSizing: 'border-box' }}>
          <div style={{ background: '#1e1e1e', padding: '28px', borderRadius: '10px', width: '100%', maxWidth: '500px', border: '1px solid #333', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#ff9800', fontSize: '18px' }}>Sons Pendentes de Aprovação</h3>
            
            {sonsPendentes.length === 0 ? (
              <p style={{ color: '#888', fontSize: '14px' }}>Nenhum som pendente no momento.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sonsPendentes.map((p) => (
                  <div key={p.id} style={{ background: '#252525', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff' }}>{p.titulo}</div>
                      <button 
                        onClick={() => new Audio(p.audioUrl).play()} 
                        style={{ background: 'transparent', border: 'none', color: '#4caf50', padding: 0, cursor: 'pointer', fontSize: '12px', marginTop: '4px', textDecoration: 'underline' }}
                      >
                        ▶ Testar áudio
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => aprovarSom(p)} style={{ background: '#4caf50', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Aprovar</button>
                      <button onClick={() => rejeitarSom(p.id)} style={{ background: '#f44336', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Rejeitar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setModalAprovacao(false)} style={{ width: '100%', marginTop: '20px', padding: '10px', background: '#2c2c2c', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Fechar</button>
          </div>
        </div>
      )}

      {/* MODAL DE LOGIN DO ADMIN */}
      {modalLogin && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '15px', boxSizing: 'border-box' }}>
          <form onSubmit={handleLoginAdmin} style={{ background: '#1e1e1e', padding: '28px', borderRadius: '10px', width: '100%', maxWidth: '380px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#ff5722', fontSize: '18px', textAlign: 'center' }}>Painel do Administrador</h3>
            {erroLogin && <p style={{ color: '#ff5252', fontSize: '13px', marginBottom: '12px', background: '#3b1c1c', padding: '8px', borderRadius: '4px' }}>{erroLogin}</p>}
            
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>E-MAIL</label>
              <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#121212', color: '#fff', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>SENHA</label>
              <input type="password" value={senhaInput} onChange={(e) => setSenhaInput(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#121212', color: '#fff', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setModalLogin(false)} style={{ flex: 1, padding: '10px', background: '#2c2c2c', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={{ flex: '1', padding: '10px', background: '#ff5722', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Entrar</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DE ADICIONAR SOM (DISPONÍVEL PARA VISITANTES E ADMIN) */}
      {modalNovoSom && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '15px', boxSizing: 'border-box' }}>
          <div style={{ background: '#1e1e1e', padding: '28px', borderRadius: '10px', width: '100%', maxWidth: '400px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '18px' }}>Enviar Novo Botão de Som</h3>
            
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>TÍTULO DO SOM</label>
              <input type="text" value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} placeholder="Ex: Minha Voz" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#121212', color: '#fff', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>URL DO ÁUDIO OU GRAVAÇÃO</label>
              <input type="text" value={urlAudio} onChange={(e) => setUrlAudio(e.target.value)} placeholder="Cole o link .mp3 ou grave ao lado" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#121212', color: '#fff', boxSizing: 'border-box', fontSize: '13px', marginBottom: '8px' }} />
              <button 
                type="button" 
                disabled={gravando}
                onClick={iniciarGravacao}
                style={{ width: '100%', padding: '10px', background: gravando ? '#d32f2f' : '#2196f3', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
              >
                {gravando ? `🎙️ Gravando... (${tempoRestante}s)` : '🎙️ Gravar Áudio (5s)'}
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>COR DO BOTÃO</label>
              <input type="color" value={novaCor} onChange={(e) => setNovaCor(e.target.value)} style={{ width: '100%', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button disabled={enviando || gravando} onClick={() => setModalNovoSom(false)} style={{ flex: 1, padding: '10px', background: '#2c2c2c', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
              <button disabled={enviando || gravando} onClick={enviarNovoSom} style={{ flex: 1, padding: '10px', background: '#ff5722', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                {enviando ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
