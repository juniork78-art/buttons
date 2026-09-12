import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc,
  deleteDoc,
  onSnapshot,
  updateDoc,
  getDoc
} from 'firebase/firestore';

const ADMIN_EMAIL = "admin@gmail.com";

try {
  const faviconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#ff5722"/>
      <text x="32" y="47" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle">BL</text>
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

  .instant-btn-large {
    width: 180px;
    height: 180px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    outline: none;
    box-shadow: 
      inset 0 10px 20px rgba(255, 255, 255, 0.4), 
      inset 0 -12px 20px rgba(0, 0, 0, 0.6), 
      0 12px 24px rgba(0, 0, 0, 0.6);
    transition: transform 0.08s ease;
  }
  .instant-btn-large::before {
    content: '';
    position: absolute;
    top: 10px;
    left: 25px;
    right: 25px;
    height: 60px;
    background: linear-gradient(to bottom, rgba(255,255,255,0.45), rgba(255,255,255,0.05));
    border-radius: 50% 50% 40% 40%;
    pointer-events: none;
  }
  .instant-btn-large:active {
    transform: scale(0.94) translateY(4px);
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
  const [usuarioObj, setUsuarioObj] = useState(null);
  const [sons, setSons] = useState([]);
  const [sonsPendentes, setSonsPendentes] = useState([]);
  const [favoritos, setFavoritos] = useState([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroFavoritos, setFiltroFavoritos] = useState(false);
  const [carregandoSons, setCarregandoSons] = useState(true);
   
  const [somSelecionado, setSomSelecionado] = useState(null);
   
  const [modalNovoSom, setModalNovoSom] = useState(false);
  const [modalLogin, setModalLogin] = useState(false);
  const [modalAprovacao, setModalAprovacao] = useState(false);

  const [novoTitulo, setNovoTitulo] = useState('');
  const [urlAudio, setUrlAudio] = useState('');
  const [novaCor, setNovaCor] = useState('#ff5722');
  const [enviando, setEnviando] = useState(false);

  const [emailInput, setEmailInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [erroLogin, setErroLogin] = useState('');
  const [carregandoLogin, setCarregandoLogin] = useState(false);

  const [gravando, setGravando] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(10);
   
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);
  const audioDataRef = useRef([]);
  const timerRef = useRef(null);
  const currentAudioRef = useRef(null);

  const coresDisponiveis = [
    '#ffffff', '#000000', '#222222', '#ff5722', '#e91e63', '#9c27b0', 
    '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#009688', 
    '#4caf50', '#8bc34a', '#ffeb3b', '#ff9800', '#795548',
    '#607d8b', '#ff4081', '#00e676'
  ];

  useEffect(() => {
    try {
      if (!auth) return;
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user && user.email) {
          setUsuarioLogado(user.email);
          setUsuarioObj(user);
        } else {
          setUsuarioLogado(null);
          setUsuarioObj(null);
          setFavoritos([]);
          setFiltroFavoritos(false);
        }
      });
      return () => unsubscribe();
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!usuarioObj || !db) {
      setFavoritos([]);
      return;
    }
    const docRef = doc(db, 'myinstants_favoritos', usuarioObj.uid);
    const unsubscribeFav = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setFavoritos(docSnap.data().lista || []);
      } else {
        setFavoritos([]);
      }
    }, (error) => {
      console.error("Erro ao sincronizar favoritos:", error);
    });

    return () => unsubscribeFav();
  }, [usuarioObj]);

  const alternarFavorito = async (idSom, e) => {
    e.stopPropagation();
    const user = auth.currentUser;
    if (!user) {
      alert("Você precisa entrar com uma conta Google para favoritar sons!");
      return;
    }

    let novosFavoritos;
    if (favoritos.includes(idSom)) {
      novosFavoritos = favoritos.filter(fav => fav !== idSom);
    } else {
      novosFavoritos = [...favoritos, idSom];
    }

    setFavoritos(novosFavoritos);

    try {
      const docRef = doc(db, 'myinstants_favoritos', user.uid);
      await setDoc(docRef, { lista: novosFavoritos }, { merge: true });
    } catch (err) {
      console.error("Erro ao salvar favorito:", err);
      alert("Erro ao salvar favorito no banco de dados. Verifique as Regras do Firestore.");
    }
  };

  const loginComGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      alert("Erro ao entrar com o Google: " + e.message);
    }
  };

  useEffect(() => {
    const handlePopState = async () => {
      const params = new URLSearchParams(window.location.search);
      const somIdUrl = params.get('id');

      if (!somIdUrl) {
        setSomSelecionado(null);
      } else {
        const encontrado = sons.find(s => s.id === somIdUrl);
        if (encontrado) {
          setSomSelecionado(encontrado);
        } else if (db) {
          try {
            const docRef = doc(db, 'myinstants_sons', somIdUrl);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              setSomSelecionado({ id: docSnap.id, ...docSnap.data() });
            }
          } catch (err) {}
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [sons]);

  useEffect(() => {
    const timerTimeout = setTimeout(() => {
      setCarregandoSons(false);
    }, 4000);

    if (db) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'myinstants_sons'), async (snapshot) => {
          clearTimeout(timerTimeout);
          const lista = [];
          snapshot.forEach((docSnap) => {
            lista.push({ id: docSnap.id, ...docSnap.data() });
          });
          setSons(lista);
          setCarregandoSons(false);

          const params = new URLSearchParams(window.location.search);
          const somIdUrl = params.get('id');
          if (somIdUrl && !somSelecionado) {
            const encontrado = lista.find(s => s.id === somIdUrl);
            if (encontrado) {
              setSomSelecionado(encontrado);
            } else {
              try {
                const docRef = doc(db, 'myinstants_sons', somIdUrl);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                  setSomSelecionado({ id: docSnap.id, ...docSnap.data() });
                }
              } catch (err) {}
            }
          }
        }, (error) => {
          clearTimeout(timerTimeout);
          console.error("Erro ao carregar sons:", error);
          setCarregandoSons(false);
        });
        return () => {
          clearTimeout(timerTimeout);
          unsubscribe();
        };
      } catch (e) {
        clearTimeout(timerTimeout);
        setCarregandoSons(false);
      }
    }
  }, []);

  useEffect(() => {
    if (db) {
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
    }
  }, []);

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
       
      setSons(prevSons => 
        prevSons.map(s => s.id === id ? { ...s, plays: novoPlays } : s)
      );

      if (somSelecionado && somSelecionado.id === id) {
        setSomSelecionado(prev => ({ ...prev, plays: novoPlays }));
      }

      await updateDoc(doc(db, 'myinstants_sons', id), { plays: novoPlays });
    } catch (e) {
      console.error(e);
    }
  };

  const excluirSom = async (id, titulo) => {
    if (window.confirm(`Deseja realmente excluir o botão "${titulo}"?`)) {
      try {
        await deleteDoc(doc(db, 'myinstants_sons', id));
        if (somSelecionado && somSelecionado.id === id) {
          setSomSelecionado(null);
          window.history.pushState({}, '', window.location.pathname);
        }
      } catch (e) {
        alert("Erro ao excluir som: " + e.message);
      }
    }
  };

  const aprovarSom = async (som) => {
    try {
      await setDoc(doc(db, 'myinstants_sons', som.id), {
        titulo: som.titulo,
        audioUrl: som.audioUrl,
        cor: som.cor,
        plays: 0,
        criadoEm: som.criadoEm || Date.now()
      });
      await deleteDoc(doc(db, 'myinstants_pendentes', som.id));
    } catch (e) {
      alert("Erro ao aprovar som: " + e.message);
    }
  };

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
    setCarregandoLogin(true);
    try {
      const result = await signInWithEmailAndPassword(auth, emailInput, senhaInput);
      setUsuarioLogado(result.user.email);
      setUsuarioObj(result.user);
      setModalLogin(false);
      setEmailInput('');
      setSenhaInput('');
    } catch (e) {
      setErroLogin('E-mail ou senha incorretos.');
    } finally {
      setCarregandoLogin(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUsuarioLogado(null);
      setUsuarioObj(null);
      setFavoritos([]);
      setFiltroFavoritos(false);
    } catch (e) {}
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert("O arquivo é muito grande. Escolha um arquivo de até 800KB.");
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setUrlAudio(reader.result);
        if (!novoTitulo) {
          setNovoTitulo(file.name.replace(/\.[^/.]+$/, ""));
        }
      };
    }
  };

  const alternarGravacao = async () => {
    if (gravando) {
      pararGravacaoWav();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      audioDataRef.current = [];

      processor.onaudioprocess = (e) => {
        const channelData = e.inputBuffer.getChannelData(0);
        audioDataRef.current.push(new Float32Array(channelData));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      setGravando(true);
      setTempoRestante(10);

      let segundos = 10;
      timerRef.current = setInterval(() => {
        segundos -= 1;
        setTempoRestante(segundos);
        if (segundos <= 0) {
          clearInterval(timerRef.current);
          pararGravacaoWav();
        }
      }, 1000);

    } catch (e) {
      console.error(e);
      alert("Erro ao acessar o microfone. Verifique as permissões do navegador.");
      setGravando(false);
    }
  };

  const pararGravacaoWav = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      if (processorRef.current && audioContextRef.current) {
        processorRef.current.disconnect();
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const chunks = audioDataRef.current;
      if (chunks.length === 0) {
        setGravando(false);
        return;
      }

      let totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      let result = new Float32Array(totalLength);
      let offset = 0;
      for (let i = 0; i < chunks.length; i++) {
        result.set(chunks[i], offset);
        offset += chunks[i].length;
      }

      const sampleRate = audioContextRef.current ? audioContextRef.current.sampleRate : 44100;
      const wavBuffer = criarBufferWav(result, sampleRate);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });

      if (blob.size > 800 * 1024) {
        alert("A gravação ficou muito longa. Tente gravar por menos tempo.");
        setGravando(false);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        setUrlAudio(reader.result);
        setGravando(false);
      };
    } catch (err) {
      console.error(err);
      setGravando(false);
    }
  };

  const criarBufferWav = (samples, sampleRate) => {
    let buffer = new ArrayBuffer(44 + samples.length * 2);
    let view = new DataView(buffer);

    const escreverString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    escreverString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    escreverString(view, 8, 'WAVE');
    escreverString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    escreverString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return buffer;
  };

  const baixarAudioDireto = async (audioUrl, titulo) => {
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
       
      const link = document.createElement('a');
      link.href = blobUrl;
      const nomeFormatado = (titulo || 'audio').trim().replace(/\.(mp3|webm|ogg|wav)$/i, '');
      link.download = `${nomeFormatado}.wav`;
       
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      const link = document.createElement('a');
      link.href = audioUrl;
      const nomeFormatado = (titulo || 'audio').trim().replace(/\.(mp3|webm|ogg|wav)$/i, '');
      link.download = `${nomeFormatado}.wav`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const enviarNovoSom = async () => {
    if (!novoTitulo.trim()) {
      alert("Preencha o título do som.");
      return;
    }

    if (!urlAudio || !urlAudio.trim()) {
      alert("Nenhum áudio foi gravado ou selecionado.");
      return;
    }

    if (urlAudio.length > 900000) {
      alert("O áudio está muito grande. O limite é de 800KB.");
      return;
    }

    setEnviando(true);
     
    try {
      const dadosSom = {
        titulo: novoTitulo.trim(),
        audioUrl: urlAudio.trim(),
        cor: novaCor,
        criadoEm: Date.now()
      };

      const isAdmin = usuarioLogado === ADMIN_EMAIL;
      const nomeColecao = isAdmin ? 'myinstants_sons' : 'myinstants_pendentes';
       
      if (isAdmin) {
        dadosSom.plays = 0;
      }

      await addDoc(collection(db, nomeColecao), dadosSom);
       
      if (isAdmin) {
        alert("Som adicionado e publicado com sucesso!");
      } else {
        alert("Som enviado para análise do Administrador!");
      }

      setModalNovoSom(false);
      setNovoTitulo('');
      setUrlAudio('');
    } catch (e) {
      console.error("Erro ao salvar:", e);
      alert("Erro ao salvar no Firebase: " + e.message);
    } finally {
      setEnviando(false);
    }
  };

  const selecionarSom = (item) => {
    setSomSelecionado(item);
    const novaUrl = `${window.location.origin}${window.location.pathname}?id=${item.id}`;
    window.history.pushState({ id: item.id }, '', novaUrl);
  };

  const voltarParaInicio = () => {
    setSomSelecionado(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  const isAdmin = usuarioLogado === ADMIN_EMAIL;
  
  const sonsFiltrados = sons.filter(s => {
    const matchBusca = s.titulo.toLowerCase().includes(termoBusca.toLowerCase());
    const matchFavorito = filtroFavoritos ? favoritos.includes(s.id) : true;
    return matchBusca && matchFavorito;
  });

  if (somSelecionado) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: '#fff', padding: '30px 20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
         
        <button 
          onClick={voltarParaInicio} 
          style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px solid #ff5722', color: '#ff5722', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px' }}
        >
          ← Voltar para Início
        </button>

        <h1 style={{ fontSize: '38px', fontWeight: 'bold', margin: '10px 0 30px 0', textAlign: 'center' }}>
          {somSelecionado.titulo}
        </h1>

        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <button 
            className="instant-btn-large"
            onClick={() => reproduzirSom(somSelecionado.id, somSelecionado.audioUrl, somSelecionado.plays)}
            style={{ 
              backgroundColor: somSelecionado.cor || '#ff5722'
            }}
          >
          </button>
          {usuarioLogado && (
            <button
              onClick={(e) => alternarFavorito(somSelecionado.id, e)}
              title={favoritos.includes(somSelecionado.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                background: '#1e1e1e',
                border: '1px solid #444',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '18px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
              }}
            >
              {favoritos.includes(somSelecionado.id) ? '❤️' : '🤍'}
            </button>
          )}
        </div>

        <div style={{ fontSize: '18px', color: '#fff', marginBottom: '8px', textAlign: 'center', maxWidth: '400px', wordBreak: 'break-word' }}>
          {somSelecionado.titulo}
        </div>

        <div style={{ fontSize: '15px', color: '#ccc', marginBottom: '8px' }}>
          Reproduções: <b>{somSelecionado.plays || 0}</b>
        </div>
        <div style={{ fontSize: '13px', color: '#888', marginBottom: '25px' }}>
          Adicionado em {new Date(somSelecionado.criadoEm || Date.now()).toLocaleDateString()}
        </div>

        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '600px' }}>
          <button 
            onClick={() => {
              const linkCompartilhamento = `${window.location.origin}${window.location.pathname}?id=${somSelecionado.id}`;
              navigator.clipboard.writeText(linkCompartilhamento);
              alert("Link da página do som copiado para a área de transferência!");
            }}
            style={{ padding: '12px 24px', backgroundColor: '#34495e', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}
          >
            🔗 Copiar endereço
          </button>

          <button 
            onClick={() => baixarAudioDireto(somSelecionado.audioUrl, somSelecionado.titulo)}
            style={{ padding: '12px 24px', backgroundColor: '#34495e', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}
          >
            💾 Baixar Áudio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: '#fff', padding: '20px', boxSizing: 'border-box' }}>
       
      <header style={{ textAlign: 'center', marginBottom: '30px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isAdmin && (
            <button 
              onClick={() => setModalAprovacao(true)}
              style={{ background: '#ff9800', border: 'none', color: '#000', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
            >
              🔔 Aprovação ({sonsPendentes.length})
            </button>
          )}

          {usuarioLogado ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1e1e1e', padding: '4px 10px', borderRadius: '6px', border: '1px solid #333' }}>
              <span style={{ fontSize: '12px', color: '#aaa' }}>{usuarioLogado} {isAdmin && '(Admin)'}</span>
              <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #ff5722', color: '#ff5722', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                Sair
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={loginComGoogle} style={{ background: '#ffffff', color: '#000000', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🌐 Entrar com Google
              </button>
              <button onClick={() => setModalLogin(true)} style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                Entrar como Admin
              </button>
            </div>
          )}
        </div>

        <h1 style={{ color: '#ff5722', fontSize: '32px', margin: '0 0 5px 0' }}>Botões loucos</h1>
        <p style={{ color: '#888', margin: 0, fontSize: '14px' }}>Os melhores botões de som da internet em tempo real</p>
      </header>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
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

      {/* ABA DE FILTRO (TODOS / FAVORITOS) */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '35px' }}>
        <button
          onClick={() => setFiltroFavoritos(false)}
          style={{
            padding: '8px 20px',
            borderRadius: '20px',
            border: 'none',
            backgroundColor: !filtroFavoritos ? '#ff5722' : '#1e1e1e',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '13px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
          }}
        >
          Todos os Sons
        </button>

        {usuarioLogado && (
          <button
            onClick={() => setFiltroFavoritos(true)}
            style={{
              padding: '8px 20px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: filtroFavoritos ? '#ff5722' : '#1e1e1e',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '13px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
            }}
          >
            ❤️ Meus Favoritos ({favoritos.length})
          </button>
        )}
      </div>

      {carregandoSons ? (
        <div style={{ textAlign: 'center', color: '#888', marginTop: '50px', fontSize: '16px' }}>Carregando botões...</div>
      ) : sonsFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888', marginTop: '50px', fontSize: '16px' }}>
          {filtroFavoritos ? 'Você ainda não favoritou nenhum som!' : 'Nenhum botão cadastrado ainda.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '25px', maxWidth: '1200px', margin: '0 auto', justifyItems: 'center' }}>
          {sonsFiltrados.map((item) => (
            <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '130px' }}>
               
              {isAdmin && (
                <button 
                  onClick={() => excluirSom(item.id, item.titulo)}
                  title="Excluir botão"
                  style={{ position: 'absolute', top: '-5px', right: '0px', background: 'rgba(235, 87, 87, 0.2)', border: 'none', color: '#eb5757', width: '26px', height: '26px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', zIndex: 2 }}
                >
                  ✕
                </button>
              )}

              <div style={{ position: 'relative', marginTop: '6px' }}>
                <button 
                  className="instant-btn"
                  onClick={() => reproduzirSom(item.id, item.audioUrl, item.plays)}
                  style={{ 
                    backgroundColor: item.cor || '#ff5722'
                  }}
                >
                </button>

                {usuarioLogado && (
                  <button
                    onClick={(e) => alternarFavorito(item.id, e)}
                    title={favoritos.includes(item.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      background: '#1e1e1e',
                      border: '1px solid #444',
                      borderRadius: '50%',
                      width: '30px',
                      height: '30px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '14px',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                      zIndex: 3
                    }}
                  >
                    {favoritos.includes(item.id) ? '❤️' : '🤍'}
                  </button>
                )}
              </div>

              <div 
                onClick={() => selecionarSom(item)}
                title={item.titulo}
                style={{ 
                  fontSize: '13px', 
                  textAlign: 'center', 
                  margin: '8px 0 2px 0', 
                  fontWeight: '600', 
                  width: '100%', 
                  cursor: 'pointer', 
                  color: '#fff',
                  wordBreak: 'break-word',
                  lineHeight: '1.25'
                }}
                onMouseOver={(e) => e.target.style.color = '#ff5722'}
                onMouseOut={(e) => e.target.style.color = '#fff'}
              >
                {item.titulo}
              </div>

              <div style={{ fontSize: '11px', color: '#888', textAlign: 'center' }}>
                Reproduções: {item.plays || 0}
              </div>
            </div>
          ))}
        </div>
      )}

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
              <button type="button" disabled={carregandoLogin} onClick={() => setModalLogin(false)} style={{ flex: 1, padding: '10px', background: '#2c2c2c', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" disabled={carregandoLogin} style={{ flex: 1, padding: '10px', background: '#ff5722', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                {carregandoLogin ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {modalNovoSom && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '15px', boxSizing: 'border-box' }}>
          <div style={{ background: '#1e1e1e', padding: '28px', borderRadius: '10px', width: '100%', maxWidth: '400px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '18px' }}>{isAdmin ? 'Adicionar Novo Botão de Som' : 'Enviar Som para Análise'}</h3>
             
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>TÍTULO DO SOM</label>
              <input type="text" value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} placeholder="Ex: Minha Voz" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#121212', color: '#fff', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>ORIGEM DO ÁUDIO</label>
               
              <input type="text" value={urlAudio.startsWith('data:') ? '[Áudio Gravado com Sucesso]' : urlAudio} onChange={(e) => setUrlAudio(e.target.value)} placeholder="Cole o link .mp3" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#121212', color: '#fff', boxSizing: 'border-box', fontSize: '13px', marginBottom: '8px' }} />

              <div style={{ display: 'flex', gap: '8px' }}>
                <label style={{ flex: 1, padding: '10px', background: '#4caf50', color: '#fff', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', textAlign: 'center' }}>
                  📁 Enviar MP3
                  <input type="file" accept="audio/mp3, audio/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>

                <button 
                  type="button" 
                  onClick={alternarGravacao}
                  style={{ flex: 1, padding: '10px', background: gravando ? '#d32f2f' : '#2196f3', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                >
                  {gravando ? `⏹️ Parar (${tempoRestante}s)` : '🎙️ Gravar (10s)'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>COR DO BOTÃO</label>
               
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                {coresDisponiveis.map((corHex) => (
                  <div 
                    key={corHex}
                    onClick={() => setNovaCor(corHex)}
                    style={{
                      width: '100%',
                      height: '34px',
                      backgroundColor: corHex,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: novaCor === corHex ? '3px solid #ff5722' : '2px solid #333',
                      boxSizing: 'border-box',
                      transition: 'transform 0.1s ease'
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button disabled={enviando || gravando} onClick={() => setModalNovoSom(false)} style={{ flex: 1, padding: '10px', background: '#2c2c2c', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
              <button disabled={enviando || gravando} onClick={enviarNovoSom} style={{ flex: 1, padding: '10px', background: '#ff5722', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                {enviando ? 'Enviando...' : (isAdmin ? 'Salvar' : 'Enviar')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
