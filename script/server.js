const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Carrega as variáveis do arquivo .env

const app = express();
app.use(cors()); // Permite que seu front-end acesse o servidor
app.use(express.json()); // Permite que o servidor entenda JSON

const PORT = process.env.PORT || 3000;

// Esta é a rota que o seu HTML vai chamar
app.get('/api/dados', async (req, res) => {
    try {
        // 1. O servidor pega a chave protegida
        const apiKey = process.env.MINHA_CHAVE_SECRETA; 

        // 2. O servidor faz a chamada real para a API externa (exemplo com fetch)
        // const response = await fetch(`https://api.externa.com/data?key=${apiKey}`);
        // const data = await response.json();

        // Exemplo de resposta simulada para teste:
        const dadosSeguros = { mensagem: "Dados vindos do back-end com segurança!" };

        // 3. Devolve apenas o necessário para o front-end
        res.json(dadosSeguros);
        
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar dados" });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando seguro na porta ${PORT}`);
});