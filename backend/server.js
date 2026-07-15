const express = require('express')
const cors = require('cors')
const axios = require('axios')
const fs = require('fs')
const { PrismaClient } = require('./generated/prisma/client.js')
const { PrismaPg } = require("@prisma/adapter-pg")

require('dotenv').config()
const app = express()

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter })

app.use(express.json())
app.use(cors())

app.post('/cadastro_equipamento', async (req, res) => {
    try {
        const { nome_equipamento, id_equipamento,
            setor, fabricante, modelo,
            data_aquisicao, status_equip,
            ultima_manutencao } = req.body.infoInputs

        const procuraEquip = await prisma.equipamento.findUnique({
            where: {
                id_equipamento
            }
        })

        if (procuraEquip) {
            console.log(procuraEquip);

            return res.status(404).json({ msg: 'Equipamento já cadastrado!' })
        }

        const addEquip = await prisma.equipamento.create({
            data: {
                nome_equipamento,
                id_equipamento,
                setor,
                fabricante,
                modelo,
                data_aquisicao: new Date(data_aquisicao),
                status_equip,
                ultima_manutencao
            }
        });

        salvaNoHistorico('cadastro', req.body.infoInputs)
        console.log(addEquip);


        res.status(200).json({ msg: "Equipamento cadastrado com sucesso!" })
    } catch (erro) {
        console.log(erro);

        res.status(500).send('Não foi possível cadastrar o equipamento')
    }
})

app.post('/ordem_manutencao', async (req, res) => {
    try {
        const { nome_equip_om, id_equip_om,
            nome_tecnico, tipo_manut, data_solicitacao,
            data_execucao, descricao_problema,
            custo, solucao_aplicada } = req.body.infoInputs

        const procuraEquipamento = await prisma.equipamento.findUnique({
            where: {
                id_equipamento: id_equip_om
            }
        })

        if (!procuraEquipamento) {
            return res.status(404).json({ msg: "Equipamento não encontrado!" })
        }

        await prisma.manutencao.create({
            data: {
                nome_equip_om,
                id_equip_om,
                nome_tecnico,
                tipo_manut,
                data_solicitacao: new Date(data_solicitacao),
                data_execucao: new Date(data_execucao),
                descricao_problema,
                custo: Number(custo),
                solucao_aplicada
            }
        });

        atualizaUltimaManutencao(req.body.infoInputs.data_execucao, req.body.infoInputs.id_equip_om)
        salvaNoHistorico('ordem-manutencao', req.body.infoInputs)

        res.status(200).json({ msg: "Ordem de manutenção criada com sucesso" })
    } catch (error) {
        console.log(error);

        res.status(500).json({ msg: "Falha ao criar ordem de manutenção" })
    }
})

app.get('/lista_equipamentos', async (req, res) => {
    try {
        const listaEquipamentos = await prisma.equipamento.findMany();

        res.status(200).send(listaEquipamentos)
    } catch (erro) {
        res.status(500).json({ msg: "Não foi possível buscar os equipamentos!" })
    }
})

app.get('/equipamento/:id', async (req, res) => {
    try {
        const id = req.params.id

        const infoEquipamento = await prisma.equipamento.findUnique({
            where: {
                id_equipamento: id
            }
        });

        const dataFormatBR = new Date(infoEquipamento["data_aquisicao"]).toLocaleDateString("pt-BR", {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
        })

        infoEquipamento["data_aquisicao"] = dataFormatBR

        res.status(200).send(infoEquipamento)
    } catch (erro) {
        res.status(500).json({ msg: "Não foi possível buscar o equipamento!" })
    }
})

app.get('/manutencoes/:id', async (req, res) => {
    try {
        const id = req.params.id

        const infoManutencao = await prisma.manutencao.findMany({
            where: {
                id_equip_om: id
            }
        });

        infoManutencao.forEach(item => {
            const dataSolicitacaoBR = new Date(item["data_solicitacao"]).toLocaleDateString("pt-BR", {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
            })

            const dataExecucaoBR = new Date(item["data_execucao"]).toLocaleDateString("pt-BR", {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
            })

            item["data_solicitacao"] = dataSolicitacaoBR
            item["data_execucao"] = dataExecucaoBR
        })

        res.status(200).send(infoManutencao)
    } catch (erro) {
        res.status(500).json({ msg: "Não foi possível buscar as manutenções!" })
    }
})

app.get('/historico', async (req, res) => {
    const historico = await prisma.historico.findMany()

    res.send(historico)
})

app.get('/info_gerais', async (req, res) => {
    try {
        const listaEquip = await prisma.equipamento.findMany()
        const listaManutencao = await prisma.manutencao.findMany()

        const infoGeral = {}
        let countManutPendente = 0

        listaEquip.map(item => {
            console.log(item);
            
            if (item.status_equip === 'em manutenção') {
                countManutPendente += 1
            }
        })

        infoGeral.total_equipamentos = listaEquip.length
        infoGeral.manut_realizadas = listaManutencao.length
        infoGeral.manut_pendentes = countManutPendente

        res.status(200).send(infoGeral)
    } catch (erro) {
        console.log(erro);
        
        res.status(500).json({ msg: "Não foi possível buscar as informações gerais" })
    }
})

app.post('/edit_equipamento', async (req, res) => {
    try {
        const { id, response } = req.body.attCampos

        const editEquip = await prisma.equipamento.update({
            where: { id_equipamento: id },
            data: response
        });

        res.status(200).json({ msg: "Equipamento editado com sucesso!" })
    } catch (error) {
        res.status(500).send("Não foi possível editar o equipamento")
    }
})

app.listen(3000, () => {
    console.log('rodando na porta 3000');
})

async function atualizaUltimaManutencao(dataExecucao, idEquip) {
    const dataFormatBR = new Date(dataExecucao).toLocaleDateString("pt-BR", {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
    })

    const addEquip = await prisma.equipamento.update({
        where: { id_equipamento: idEquip },
        data: { ultima_manutencao: dataFormatBR }
    });
}

async function salvaNoHistorico(definicao, infoData) {
    if (definicao === 'cadastro') {
        let infoCreate = {}

        infoCreate.acao_criada = 'Equipamento cadastrado'
        infoCreate.msg = `${infoData.nome_equipamento} ( ${infoData.modelo} ) foi cadastrado no sistema`
        infoCreate.data = new Date()

        const addHistorico = await prisma.historico.create({
            data: {
                acao_criada: infoCreate.acao_criada,
                msg: infoCreate.msg,
                data: infoCreate.data
            }
        });

    } else if (definicao === 'ordem-manutencao') {
        let infoCreate = {}

        infoCreate.acao_criada = `Manutenção ${infoData.tipo_manut} concluída`
        infoCreate.msg = `Equipamento: ${infoData.nome_equip_om} ( ${infoData.id_equip_om} )`
        infoCreate.data = new Date()

        const addHistorico = await prisma.historico.create({
            data: {
                acao_criada: infoCreate.acao_criada,
                msg: infoCreate.msg,
                data: infoCreate.data
            }
        });
    }
}