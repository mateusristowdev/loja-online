const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")
const crypto = require("crypto")
const prisma = require("../lib/prisma")

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/")
  },

  filename: function (req, file, cb) {
    const extensao = path.extname(file.originalname)

    const nomeArquivo = crypto
      .randomBytes(32)
      .toString("hex")

    cb(null, `${nomeArquivo}${extensao}`)
  }
})

const upload = multer({ storage })

function converterBooleano(valor) {
  if (typeof valor === "boolean") {
    return valor
  }

  return valor === "true"
}

const routerGetProdutos = async (req, res, next) => {
  try {
    console.log("=================================")
    console.log("GET /produtos")
    console.log("Buscando produtos no banco...")

    const produtos = await prisma.produtos.findMany({
      orderBy: {
        id: "desc"
      }
    })

    console.log("Produtos encontrados:")
    console.log(produtos)

    console.log("Quantidade:", produtos.length)
    console.log("=================================")

    res.json(produtos)

  } catch (err) {
    console.error("ERRO AO BUSCAR PRODUTOS:")
    console.error(err)

    next(err)
  }
}

router.get("/", routerGetProdutos)

router.get("/destaques", async (req, res, next) => {
  try {
    const produtos = await prisma.produtos.findMany({
      where: {
        destaque: true
      },
      take: 4,
      orderBy: {
        id: "desc"
      }
    })

    res.json(produtos)

  } catch (err) {
    next(err)
  }
})

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id)

    const produto = await prisma.produtos.findUnique({
      where: {
        id
      }
    })

    if (!produto) {
      const err = new Error("Produto não encontrado")
      err.status = 404
      throw err
    }

    res.json(produto)

  } catch (err) {
    next(err)
  }
})

router.post("/", upload.single("imagem"), async (req, res, next) => {
  try {

    const {
      nome,
      clube,
      pais,
      liga,
      continente,
      temporada,
      tipo,
      marca,
      cor,
      descricao,
      preco,
      precoOriginal,
      estoque,
      destaque,
      novo,
      categoriasId,
      peso,
      altura,
      largura,
      comprimento

    } = req.body

    const imagem = req.file
      ? req.file.filename
      : ""

    if (
      !nome ||
      !clube ||
      !pais ||
      !liga ||
      !continente ||
      !temporada ||
      !tipo ||
      !marca ||
      !cor ||
      !descricao ||
      preco === undefined ||
      precoOriginal === undefined ||
      estoque === undefined ||
      !categoriasId ||
      peso === undefined ||
      altura === undefined ||
      largura === undefined ||
      comprimento === undefined
    ) {
      const err = new Error(
        "Todos os campos obrigatórios devem ser preenchidos"
      )

      err.status = 400
      throw err
    }

    const categoria = await prisma.categorias.findUnique({
      where: {
        id: Number(categoriasId)
      }
    })

    if (!categoria) {
      const err = new Error("Categoria não encontrada")
      err.status = 404
      throw err
    }

    const novoProduto = await prisma.produtos.create({
      data: {

        nome,
        clube,
        pais,
        liga,
        continente,
        temporada,
        tipo,
        marca,
        cor,
        descricao,

        preco: Number(preco),

        precoOriginal: Number(precoOriginal),

        imagem,

        estoque: Number(estoque),

        destaque: converterBooleano(destaque),

        novo: converterBooleano(novo),

        categoriasId: Number(categoriasId),

        peso: Number(peso),
        altura: Number(altura),
        largura: Number(largura),
        comprimento: Number(comprimento)
      }
    })

    console.log("Produto criado:")
    console.log(novoProduto)

    res.status(201).json(novoProduto)

  } catch (err) {
    next(err)
  }
})

router.put("/:id", upload.single("imagem"), async (req, res, next) => {
  try {

    const id = Number(req.params.id)

    const produto = await prisma.produtos.findUnique({
      where: {
        id
      }
    })

    if (!produto) {
      const err = new Error("Produto não encontrado")
      err.status = 404
      throw err
    }

    const {
      nome,
      clube,
      pais,
      liga,
      continente,
      temporada,
      tipo,
      marca,
      cor,
      descricao,
      preco,
      precoOriginal,
      estoque,
      destaque,
      novo,
      categoriasId,
      peso,
      altura,
      largura,
      comprimento

    } = req.body

    const produtoAtualizado =
      await prisma.produtos.update({

        where: {
          id
        },

        data: {

          ...(nome !== undefined && {
            nome
          }),

          ...(clube !== undefined && {
            clube
          }),

          ...(pais !== undefined && {
            pais
          }),

          ...(liga !== undefined && {
            liga
          }),

          ...(continente !== undefined && {
            continente
          }),

          ...(temporada !== undefined && {
            temporada
          }),

          ...(tipo !== undefined && {
            tipo
          }),

          ...(marca !== undefined && {
            marca
          }),

          ...(cor !== undefined && {
            cor
          }),

          ...(descricao !== undefined && {
            descricao
          }),

          ...(preco !== undefined && preco !== "" && {
            preco: Number(preco)
          }),

          ...(precoOriginal !== undefined &&
            precoOriginal !== "" && {
              precoOriginal: Number(precoOriginal)
            }),

          ...(req.file && {
            imagem: req.file.filename
          }),

          ...(estoque !== undefined && estoque !== "" && {
            estoque: Number(estoque)
          }),

          ...(destaque !== undefined && {
            destaque: converterBooleano(destaque)
          }),

          ...(novo !== undefined && {
            novo: converterBooleano(novo)
          }),

          ...(categoriasId !== undefined &&
            categoriasId !== "" && {
              categoriasId: Number(categoriasId)
            }),

          ...(peso !== undefined &&
            peso !== "" && {
              peso: Number(peso)
            }),

          ...(altura !== undefined &&
            altura !== "" && {
              altura: Number(altura)
            }),

          ...(largura !== undefined &&
            largura !== "" && {
              largura: Number(largura)
            }),

          ...(comprimento !== undefined &&
            comprimento !== "" && {
              comprimento: Number(comprimento)
            })
        }
      })

    console.log("Produto atualizado:")
    console.log(produtoAtualizado)

    res.json(produtoAtualizado)

  } catch (err) {

    console.error(
      "ERRO AO ATUALIZAR PRODUTO:"
    )

    console.error(err)

    next(err)
  }
})

router.delete("/:id", async (req, res, next) => {
  try {

    const id = Number(req.params.id)

    const produto = await prisma.produtos.findUnique({
      where: {
        id
      }
    })

    if (!produto) {
      const err = new Error("Produto não encontrado")
      err.status = 404
      throw err
    }

    await prisma.produtos.delete({
      where: {
        id
      }
    })

    res.status(204).send()

  } catch (err) {
    next(err)
  }
})

module.exports = router