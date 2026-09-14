const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");

const CEP_ORIGEM = "15500000";

const MELHOR_ENVIO_BASE_URL =
  process.env.MELHOR_ENVIO_ENV === "production"
    ? "https://melhorenvio.com.br"
    : "https://sandbox.melhorenvio.com.br";

async function obterTokenMelhorEnvio() {
  const response = await fetch(
    `${MELHOR_ENVIO_BASE_URL}/oauth/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent":
          "MANTO 017 (suporte@seuemail.com)",
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: process.env.MELHOR_ENVIO_CLIENT_ID,
        client_secret: process.env.MELHOR_ENVIO_CLIENT_SECRET,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "Erro ao obter token do Melhor Envio:",
      data
    );

    throw new Error(
      data.message ||
      data.error ||
      "Não foi possível autenticar no Melhor Envio."
    );
  }

  return data.access_token;
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

    if (!produtos || !Array.isArray(produtos) || produtos.length === 0) {
      return res.status(400).json({
        erro: "Nenhum produto informado para calcular o frete."
      });
    }

    const cepDestinoLimpo = String(cepDestino).replace(/\D/g, "");

    if (cepDestinoLimpo.length !== 8) {
      return res.status(400).json({
        erro: "CEP de destino inválido."
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
        !peso ||
        !altura ||
        !largura ||
        !comprimento ||
        valor < 0
      ) {
        throw new Error(
          `Dados de dimensões/peso inválidos no produto ${index + 1}.`
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
        insurance_value: valor,
        quantity: quantidade
      };
    });

    const token = await obterTokenMelhorEnvio();

    const response = await fetch(
      `${MELHOR_ENVIO_BASE_URL}/api/v2/me/shipment/calculate`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
          "User-Agent":
            "MANTO 017 (suporte@seuemail.com)"
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

    res.json({
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