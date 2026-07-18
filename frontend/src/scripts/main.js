const server = axios.create({
    baseURL: 'http://localhost:3000'
})

const screenCadastroEquip = document.querySelector(".screen-cadastro-equip")
const screenOrdemManut = document.querySelector(".screen-ordem-manut")

const btnCadastroEquip = document.querySelector(".bnt-cadastro-equip")
const btnOrdemManut = document.querySelector(".bnt-ordem-manut")
const btnHistorico = document.querySelector(".btn-historico")
const containerHistorico = document.querySelector('.lista-historico')
const btnsExit = document.querySelectorAll('.btn-exit')

const inputsCadastroEquip = document.querySelectorAll(".screen-cadastro-equip input")
const inputsOM = document.querySelectorAll(".screen-ordem-manut input")
const selectStatusEquip = document.getElementById('status_equip')
const selectTipoManut = document.getElementById('tipo_manut')

const salvaRespostaInputs = {
    cadastroEquipamentos: {
        nome_equipamento: null,
        id_equipamento: null,
        setor: null,
        fabricante: null,
        modelo: null,
        data_aquisicao: null,
        status_equip: null,
        ultima_manutencao: 'Não possui'
    },
    ordemManutencao: {
        id_equip_om: null,
        nome_tecnico: null,
        tipo_manut: null,
        data_solicitacao: null,
        data_execucao: null,
        descricao_problema: null,
        solucao_aplicada: null,
        custo: null
    }
}

server.get('/info_gerais').then(res => {
    const response = res.data
    console.log(res);


    for (const totalItem in response) {
        if (response[totalItem] < 10 && response[totalItem] > 0) {
            response[totalItem] = "0" + response[totalItem]
        }
    }

    document.querySelector('.total-equipamentos').innerText = res.data.total_equipamentos
    document.querySelector('.manut-realizadas').innerText = res.data.manut_realizadas
    document.querySelector('.manut-pendentes').innerText = res.data.manut_pendentes
})

btnHistorico.addEventListener('click', () => {
    abrePopup(document.querySelector(".container-historico"))

    server.get('/historico').then(res => {
        containerHistorico.innerHTML = ''
        
        if (res.data.length === 0) {
            containerHistorico.innerHTML = `<li class="historico-vazio">Não possui histórico dos registros</li`
        }

        res.data.map(item => {
            const dataFormatBR = new Date(item.data).toLocaleDateString("pt-BR", {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
            })

            const hourFormatBR = new Date(item.data).toLocaleTimeString("pt-BR", {
                hour: '2-digit',
                minute: '2-digit'
            })

            containerHistorico.innerHTML += `
            <li class="card-historico" id="${item.id}">
                <h3>${item.acao_criada}</h3>

                <div class="section-info">
                    <p class="msg-historico">${item.msg}</p>
                    <p class="text-date">Data: <span>${dataFormatBR} - ${hourFormatBR}</span></p>
                </div>
            </li>
        `
        })
    })
})

btnCadastroEquip.addEventListener('click', () => {
    abrePopup(screenCadastroEquip)

    document.getElementById('btn-add-equip').addEventListener("click", (e) => {
        e.preventDefault()
        validaInputs(inputsCadastroEquip, selectStatusEquip, screenCadastroEquip, salvaRespostaInputs.cadastroEquipamentos, "/cadastro_equipamento")
    })
})

btnOrdemManut.addEventListener('click', () => {
    abrePopup(screenOrdemManut)

    document.getElementById('btn-om').addEventListener("click", (e) => {
        e.preventDefault()
        validaInputs(inputsOM, selectTipoManut, screenOrdemManut, salvaRespostaInputs.ordemManutencao, "/ordem_manutencao")
    })
})

btnsExit.forEach(exit => {
    exit.addEventListener('click', () => {
        fechaPopup(exit.parentElement)

        if (exit.id === 'exit-cadastro-equip') {
            limpaInputs(selectStatusEquip, inputsCadastroEquip)
        } else if (exit.id === 'exit-om') {
            limpaInputs(selectTipoManut, inputsOM)
        }
    })
})

function validaInputs(inputsList, selectInput, screenContainer, infoInputs, rota) {
    let respostasValidas = true

    inputsList.forEach(input => {
        input.addEventListener('change', () => {
            input.parentElement.querySelector('.campo-vazio').classList.remove('aparece');
        })

        if (input.value === '') {
            input.parentElement.querySelector('.campo-vazio').classList.add('aparece');
            respostasValidas = false
        } else {
            infoInputs[input.id] = input.value.toLowerCase()
        }
    })

    selectInput.addEventListener('change', () => {
        if (selectInput.value !== 'default') {
            selectInput.parentElement.querySelector('.campo-vazio').classList.remove('aparece')
        }
    })

    if (selectInput.value === 'default') {
        selectInput.parentElement.querySelector('.campo-vazio').classList.add('aparece')
        respostasValidas = false
    } else {
        selectInput.parentElement.querySelector('.campo-vazio').classList.remove('aparece')
        infoInputs[selectInput.id] = selectInput.selectedOptions[0].text.toLowerCase()
    }

    if (respostasValidas === true) {
        const popupFedback = document.querySelector('.screen-feedback')

        server.post(rota, { infoInputs }).then(res => {
            if (res.status === 200) {
                document.querySelector('.text-feedback').innerText = res.data.msg
                popupFedback.style.backgroundColor = 'oklch(52.7% 0.154 150.069)'
                popupFedback.classList.add("aparece-feedback")

                setTimeout(() => {
                    popupFedback.classList.remove("aparece-feedback")
                }, 4000)
            }

            screenContainer.classList.remove("aparece")
            limpaInputs(selectInput, inputsList)
        }).catch(erro => {
            popupFedback.style.backgroundColor = 'oklch(44.4% 0.177 26.899)'
            document.querySelector('.text-feedback').innerText = erro.response.data.msg
            popupFedback.classList.add("aparece-feedback")

            setTimeout(() => {
                popupFedback.classList.remove("aparece-feedback")
            }, 3000)
        })
    }
}

function limpaInputs(selectName, inputsArray) {
    inputsArray.forEach(input => {
        input.parentElement.querySelector('.campo-vazio').classList.remove('aparece');
        input.value = ''
    })

    if (selectName.value !== 'default') {
        selectName.value = 'default'
    } else {
        selectName.parentElement.querySelector('.campo-vazio').classList.remove('aparece')
    }
}

function abrePopup(screen) {
    screen.classList.add("aparece")

    document.querySelector('main').style.filter = 'blur(3px)'
    document.querySelector('header').style.filter = 'blur(3px)'
    document.querySelector('body').style.overflow = 'hidden'
}

function fechaPopup(screen) {
    screen.classList.remove("aparece")

    document.querySelector('main').style.filter = 'blur(0)'
    document.querySelector('header').style.filter = 'blur(0)'
    document.querySelector('body').style.overflow = 'auto'
}