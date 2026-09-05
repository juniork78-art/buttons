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
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #444', background: '#121212', color: '#fff', boxSizing: 'border-box' }} />
        </div>

        <button type="submit" style={{ width: '100%', padding: '12px', background: '#ff5722', border: 'none', color: '#fff', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', fontSize: '15px' }}>
          Entrar
        </button>
      </form>
    </div>
  );
}
