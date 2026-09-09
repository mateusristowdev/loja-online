require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const path = require("path")
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
)

const authRoutes = require("./routes/auth");

app.use("/auth", authRoutes);

const produtosRoutes = require("./routes/produtos");
const categoriasRoutes = require("./routes/categorias");
const informacoesRoutes = require("./routes/informacoes");
const usuariosRoutes = require("./routes/usuarios");
const pedidosRoutes = require("./routes/pedidos");
const cuponsRoutes = require("./routes/cupons");
const enderecosRoutes = require("./routes/enderecos");
const favoritosRoutes = require("./routes/favoritos");
const carrinhoRoutes = require("./routes/carrinho");
const pagamentosRoutes = require("./routes/pagamentos");
const fretesRoutes = require("./routes/fretes");

function autenticarToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({
      erro: "Entre na sua conta para adicionar ao carrinho.",
    });
  }

  console.log(req.headers.authorization)

  const token = authorization.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      erro: "Token não informado",
    });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET,
    (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({
            erro: "Token expirado",
          });
        }

        console.error(err);

        return res.status(403).json({
          erro: "Token inválido",
        });
      }

      req.usuarios = decoded;

      next();
    }
  );
}

app.use("/produtos", produtosRoutes);

app.use("/categorias", categoriasRoutes);

app.use("/informacoes", informacoesRoutes);

app.use("/usuarios", usuariosRoutes);

app.use("/pedidos", autenticarToken, pedidosRoutes);

app.use("/cupons", autenticarToken, cuponsRoutes);

app.use("/enderecos", autenticarToken, enderecosRoutes);

app.use("/favoritos", autenticarToken, favoritosRoutes);

app.use("/carrinho", autenticarToken, carrinhoRoutes);

app.use("/pagamentos", autenticarToken, pagamentosRoutes);

app.use("/fretes", autenticarToken, fretesRoutes);

app.get("/", (req, res) => {
  res.json({
    projeto: "Loja Ecommerce Online",
    status: "online",
  });
});

app.get("/saude", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    erro: "Rota não encontrada",
  });
});

app.use((err, req, res, next) => {
  console.error(`[ERRO] ${err.message}`);

  const status = err.status || 500;
  const mensagem = err.message || "Erro interno do servidor";

  res.status(status).json({
    erro: mensagem,
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});