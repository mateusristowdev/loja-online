const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");

console.log(
  "MELHOR_ENVIO_ACCESS_TOKEN:",
  process.env.MELHOR_ENVIO_ACCESS_TOKEN
    ? "CONFIGURADO"
    : "NAO CONFIGURADO"
);

const CEP_ORIGEM = "96020360";

const MELHOR_ENVIO_BASE_URL =
  process.env.MELHOR_ENVIO_ENV === "production"
    ? "https://melhorenvio.com.br"
    : "https://sandbox.melhorenvio.com.br";

const USER_AGENT =
  process.env.MELHOR_ENVIO_USER_AGENT ||
  "MANTO 017 (suporte@manto017.com)";

function obterTokenMelhorEnvio() {
  const token = process.env.MELHOR_ENVIO_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      "MELHOR_ENVIO_ACCESS_TOKEN não configurado no ambiente."
    );
  }

  return token;
}

router.post("/calcular", async (req, res, next) => {
  try {
    const {
      cepDestino,
      produtos
    } = req.body;

    if (!cepDestino) {
      return res.status(400).json({
        erro: "CEP de destino não informado."
      });
    }

    const cepDestinoLimpo = String(cepDestino).replace(/\D/g, "");

    if (cepDestinoLimpo.length !== 8) {
      return res.status(400).json({
        erro: "CEP de destino inválido."
      });
    }

    if (!Array.isArray(produtos) || produtos.length === 0) {
      return res.status(400).json({
        erro: "Nenhum produto informado para calcular o frete."
      });
    }

    const produtosMelhorEnvio = produtos.map((produto, index) => {
      const peso = Number(produto.peso);
      const altura = Number(produto.altura);
      const largura = Number(produto.largura);
      const comprimento = Number(produto.comprimento);
      const valor = Number(produto.valor);
      const quantidade = Number(produto.quantidade || 1);

      if (
        !Number.isFinite(peso) ||
        peso <= 0 ||
        !Number.isFinite(altura) ||
        altura <= 0 ||
        !Number.isFinite(largura) ||
        largura <= 0 ||
        !Number.isFinite(comprimento) ||
        comprimento <= 0 ||
        !Number.isFinite(valor) ||
        valor < 0 ||
        !Number.isFinite(quantidade) ||
        quantidade <= 0
      ) {
        throw new Error(
          `Dados de peso, dimensões ou valor inválidos no produto ${index + 1}.`
        );
      }

      return {
        id: String(
          produto.id ||
          produto.nome ||
          `produto-${index + 1}`
        ),

        width: largura,
        height: altura,
        length: comprimento,
        weight: peso,
        insurance_value: Number(valor.toFixed(2)),
        quantity: quantidade
      };
    });

    const token = obterTokenMelhorEnvio();

    const response = await fetch(
      `${MELHOR_ENVIO_BASE_URL}/api/v2/me/shipment/calculate`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
          "User-Agent": USER_AGENT
        },

        body: JSON.stringify({
          from: {
            postal_code: CEP_ORIGEM
          },

          to: {
            postal_code: cepDestinoLimpo
          },

          products: produtosMelhorEnvio,

          options: {
            receipt: false,
            own_hand: false
          }
        })
      }
    );


    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Erro no cálculo do Melhor Envio:",
        data
      );

      return res.status(response.status).json({
        erro: "Erro ao calcular o frete no Melhor Envio.",
        detalhes: data
      });
    }

    return res.json({
      origem: CEP_ORIGEM,
      destino: cepDestinoLimpo,
      fretes: data
    });

  } catch (err) {
    console.error(
      "Erro na rota /fretes/calcular:",
      err
    );

    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const fretes = await prisma.fretes.findMany();

    res.json(fretes);

  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const frete = await prisma.fretes.findUnique({
      where: { id }
    });

    if (!frete) {
      return res.status(404).json({
        erro: "Frete não encontrado"
      });
    }

    res.json(frete);

  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const {
      nome,
      valor,
      prazoDias
    } = req.body;

    const frete = await prisma.fretes.create({
      data: {
        nome,
        valor,
        prazoDias
      }
    });

    res.status(201).json(frete);

  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const frete = await prisma.fretes.update({
      where: { id },
      data: req.body
    });

    res.json(frete);

  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    await prisma.fretes.delete({
      where: { id }
    });

    res.sendStatus(204);

  } catch (err) {
    next(err);
  }
});

module.exports = router;