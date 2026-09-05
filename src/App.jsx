import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updatePassword 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';

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
  @keyframes clickAnim {
    0% { transform: scale(1); }
    50% { transform: scale(0.92); }
    100% { transform: scale(1); }
  }
  .instant-btn-clicked {
    animation: clickAnim 0.15s ease;
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
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [sons, setSons] = useState([]);
  const [termoBusca, setTermoBusca] = useState('');
  
  // Modal de Adicionar Novo Som
  const [modalNovoSom, setModalNovoSom] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoUrlAudio, setNovoUrlAudio] = useState('');
  const [novaCor, setNovaCor] = useState('#ff5722');

  useEffect(() => {
    try {
      if (!auth) {
        setLoadingAuth(false);
        return;
      }
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user && user.email) {
          setUsuarioLogado(user.email);
        } else {
          setUsuarioLogado(null);
        }
        setLoadingAuth(false);
      });
      return () => unsubscribe();
    } catch (e) {
      setLoadingAuth(false);
    }
  }, []);

  // Sincroniza os sons do Firestore (coleção 'myinstants_sons')
  useEffect(() => {
    if (usuarioLogado && db) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'myinstants_sons'), (snapshot) => {
          const lista = [];
          snapshot.forEach((docSnap) => {
            lista.push({ id: docSnap.id, ...docSnap.data() });
          });
          
          // Se o banco estiver vazio, carrega alguns sons padrão iniciais
          if (lista.length === 0) {
            const padroes = [
              { id: '1', titulo: 'Airhorn', cor: '#e91e63', plays: 1245, audioUrl: 'https://www.myinstants.com/media/sounds/mlg-airhorn.mp3' },
              { id: '2', titulo: 'Tum Dun TSS', cor: '#009688', plays: 2310, audioUrl: 'https://www.myinstants.com/media/sounds/rimshot.mp3' },
              { id: '3', titulo: 'Sad Violin', cor: '#ff9800', plays: 654, audioUrl: 'https://www.myinstants.com/media/sounds/sad-violin.mp3' },
              { id: '4', titulo: 'Illuminati', cor: '#607d8b', plays: 3200, audioUrl: 'https://www.myinstants.com/media/sounds/illuminati.mp3' },
              { id: '5', titulo: 'Falha Miserável', cor: '#f44336', plays: 5410, audioUrl: 'https://www.myinstants.com/media/sounds/falha-miseravel.mp3' }
            ];
            padroes.forEach(p => setDoc(doc(db, 'myinstants_sons', p.id), p));
          } else {
            setSons(lista);
          }
        });
        return () => unsubscribe();
      } catch (e) {}
    }
  }, [usuarioLogado]);

  const reproduzirSom = async (id, audioUrl, playsAtuais) => {
    try {
      const audio = new Audio(audioUrl);
      audio.play().catch(err => console.log("Erro ao tocar áudio:", err));

      // Atualiza o contador de cliques no Firestore em tempo real
      const novoPlays = (playsAtuais || 0) + 1;
      await updateDoc(doc(db, 'myinstants_sons', id), { plays: novoPlays });
    } catch (e) {
      console.error(e);
    }
  };

  const criarNovoSom = async () => {
    if (!novoTitulo.trim() || !novoUrlAudio.trim()) {
      alert("Preencha o título e a URL do áudio.");
      return;
    }
    const novoId = Date.now().toString();
    try {
      await setDoc(doc(db, 'myinstants_sons', novoId), {
        titulo: novoTitulo.trim(),
        audioUrl: novoUrlAudio.trim(),
        cor: novaCor,
        plays: 0,
        criadoEm: Date.now()
      });
      setModalNovoSom(false);
      setNovoTitulo('');
      setNovoUrlAudio('');
    } catch (e) {
      alert("Erro ao criar som: " + e.message);
    }
  };

  if (loadingAuth) {
    return (
      <div style={{ color: '#fff', backgroundColor: '#121212', textAlign: 'center', marginTop: '40vh', fontFamily: 'sans-serif', fontSize: '16px', fontWeight: 'bold' }}>
        Carregando Instants...
      </div>
    );
  }

  if (!usuarioLogado) {
    return <TelaLogin onLoginSucesso={(email) => setUsuarioLogado(email)} />;
  }

  const sonsFiltrados = sons.filter(s => s.titulo.toLowerCase().includes(termoBusca.toLowerCase()));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: '#fff', padding: '20px', boxSizing: 'border-box' }}>
      
      {/* CABEÇALHO */}
      <header style={{ textAlign: 'center', marginBottom: '30px', position: 'relative' }}>
        <button onClick={() => signOut(auth)} style={{ position: 'absolute', top: 0, right: 0, background: 'transparent', border: '1px solid #ff5722', color: '#ff5722', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Sair
        </button>
        <h1 style={{ color: '#ff5722', fontSize: '32px', margin: '0 0 5px 0' }}>MyInstants</h1>
        <p style={{ color: '#888', margin: 0, fontSize: '14px' }}>Os melhores botões de som da internet em tempo real</p>
      </header>

      {/* BARRA DE PESQUISA E BOTÃO ADICIONAR */}
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

      {/* GRADE DE BOTÕES (GRID DO MYINSTANTS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {sonsFiltrados.map((item) => (
          <div key={item.id} style={{ backgroundColor: '#1e1e1e', borderRadius: '10px', padding: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 10px rgba(0,0,0,0.4)', transition: 'transform 0.2s' }}>
            
            {/* BOTÃO REDONDO PRINCIPAL */}
            <button 
              onClick={() => reproduzirSom(item.id, item.audioUrl, item.plays)}
              style={{ width: '90px', height: '90px', borderRadius: '50%', border: 'none', backgroundColor: item.cor || '#ff5722', color: '#fff', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '13px', padding: '10px', wordBreak: 'break-word', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', transition: 'transform 0.1s' }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {item.titulo}
            </button>

            <div style={{ fontSize: '15px', textAlign: 'center', margin: '12px 0 4px 0', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
              {item.titulo}
            </div>
            <div style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
              Reproduções: {item.plays || 0}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL PARA ADICIONAR NOVO SOM */}
      {modalNovoSom && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '15px', boxSizing: 'border-box' }}>
          <div style={{ background: '#1e1e1e', padding: '28px', borderRadius: '10px', width: '100%', maxWidth: '400px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '18px' }}>Adicionar Novo Botão de Som</h3>
            
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>TÍTULO DO SOM</label>
              <input type="text" value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} placeholder="Ex: Airhorn" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#121212', color: '#fff', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>URL DO ÁUDIO (.MP3)</label>
              <input type="text" value={novoUrlAudio} onChange={(e) => setNovoUrlAudio(e.target.value)} placeholder="https://exemplo.com/som.mp3" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#121212', color: '#fff', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>COR DO BOTÃO</label>
              <input type="color" value={novaCor} onChange={(e) => setNovaCor(e.target.value)} style={{ width: '100%', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModalNovoSom(false)} style={{ flex: 1, padding: '10px', background: '#2c2c2c', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={criarNovoSom} style={{ flex: 1, padding: '10px', background: '#ff5722', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function TelaLogin({ onLoginSucesso }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      const result = await signInWithEmailAndPassword(auth, email, senha);
      onLoginSucesso(result.user.email);
    } catch (e) {
      setErro('Erro ao entrar: Verifique seu e-mail e senha.');
    }
  };

  return (
    <div style={{ backgroundColor: '#121212', color: '#fff', minHeight: '100vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <form onSubmit={handleLogin} style={{ background: '#1e1e1e', padding: '35px 28px', borderRadius: '10px', width: '100%', maxWidth: '380px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <h2 style={{ textAlign: 'center', color: '#ff5722', marginTop: 0, marginBottom: '25px' }}>MyInstants Login</h2>

        {erro && <p style={{ color: '#ff5252', fontSize: '13px', marginBottom: '15px', background: '#3b1c1c', padding: '10px', borderRadius: '6px' }}>{erro}</p>}

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>E-MAIL</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #444', background: '#121212', color: '#fff', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>SENHA</label>
          <input type="password" value={senha} onChange={(e) => setAudioLoginSenha ? null : setSenha(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #444', background: '#121212', color: '#fff', boxSizing: 'border-box' }} />
        </div>

        <button type="submit" style={{ width: '100%', padding: '12px', background: '#ff5722', border: 'none', color: '#fff', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', fontSize: '15px' }}>
          Entrar
        </button>
      </form>
    </div>
  );
}
