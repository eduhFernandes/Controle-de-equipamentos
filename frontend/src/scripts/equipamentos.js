const server = axios.create({
    baseURL: 'http://localhost:3000'
})

server.get('/lista_equipamentos').then((res) => {
    const response = res.data
    const containerEquipamentos = document.querySelector('.list-equipamentos')
    const exit = document.getElementById('exit-edit')

    if (response.length === 0) {
        containerEquipamentos.innerHTML = `<li class="equips-nao-encontrado">Nenhum equipamento encontrado<li>`
        return
    }

    response.map(item => {
        const element = document.createElement('li')
        const attr = document.createAttribute('id')
        attr.value = 'equip-' + item.id_equipamento
        element.setAttributeNode(attr)
        element.classList.add('equipamento')

        element.innerHTML = `
        <button class="btn-edit"><i class="fa-regular fa-pen-to-square"></i></button>
        <h3>Identificação: <span class="id-equip-card">${item.id_equipamento}</span></h3>
        <p>Tipo: <span>${item.nome_equipamento}</span></p>

        <p>Setor: <span>${item.setor}</span></p>
        <p>Status: <span>${item.status_equip}</span></p>

        <p>Ultima manutenção: <span>${item.ultima_manutencao}</span></p>
    `

        containerEquipamentos.appendChild(element)
    })

    document.querySelectorAll('.equipamento').forEach(equipamento => {
        equipamento.addEventListener('click', () => {
            const spanInfos = document.querySelectorAll('.todas-info span')
            const idEquipamento = equipamento.querySelector('.id-equip-card').innerText.toLowerCase()

            server.get(`/equipamento/${idEquipamento}`).then(res => {
                const infoEquipamento = res.data

                spanInfos.forEach(span => {
                    for (const item in infoEquipamento) {
                        if (span.id === 'info_' + item) {
                            console.log(span.id, item);
                            document.getElementById(`${span.id}`).innerText = infoEquipamento[item]
                        }
                    }

                })
            })

            server.get(`/manutencoes/${idEquipamento}`).then(res => {
                const infoManutencoes = res.data
                const containerManutencao = document.querySelector('.info-completa-manutencoes')

                if (infoManutencoes.length === 0) {
                    containerManutencao.innerHTML = `
                        <li>Não possui manutenções</li>
                    `
                    return
                }

                containerManutencao.innerHTML = ''

                infoManutencoes.map(manutencao => {
                    containerManutencao.innerHTML += `
                    <li>
                        <article class="manutencao">
                            <p>Manutenção <span>${manutencao.tipo_manut}</span></p>

                            <ul class="todas-info-manutencao">
                                <li><strong>Tecnico responsável: </strong><span>${manutencao.nome_tecnico}</span></li>
                                <li>Data da solicitação: <span>${manutencao.data_solicitacao}</span></li>
                                <li>Data da execução: <span>${manutencao.data_execucao}</span></li>
                                <li>Descrição do problema: <span>${manutencao.descricao_problema}</span></li>
                                <li>Solução aplicada: <span>${manutencao.solucao_aplicada}</span></li>
                                <li>Custo: R$<span>${manutencao.custo}</span></li>
                            </ul>
                        </article>
                    </li>
                    `
                })
            })

            abrePopup(document.querySelector('.screen-detalhes'))

            document.getElementById('exit-detalhes').addEventListener('click', () => {
                fechaPopup(document.querySelector('.screen-detalhes'))
            })
        })
    })

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();

            const exit = document.getElementById('exit-edit')
            const infosCard = btn.parentElement.querySelectorAll('span')
            const inputs = document.querySelectorAll('.inputs input')
            const select = document.getElementById('status_equip')

            abrePopup(document.querySelector('.screen-edit-equip'))
            document.getElementById('ultima_manutencao').disabled = true;

            inputs.forEach((input, index) => {
                if ((index + 1) === 3) {
                    for (var i = 0; i < select.options.length; i++) {
                        if (select.options[i].text.toLowerCase() === infosCard[index + 1].innerText.toLowerCase()) {
                            select.selectedIndex = i
                            break
                        }
                    }

                    input.value = infosCard[index + 2].innerText
                    return
                }

                input.value = infosCard[index + 1].innerText
            })

            exit.addEventListener('click', () => {
                fechaPopup(exit.parentElement)
            })

            document.getElementById('btn-salva-edit').addEventListener('click', (e) => {
                e.preventDefault()

                const verificaSelectIgual = select.options[select.selectedIndex].text === infosCard[3].innerText
                const attCampos = { response: {} }

                if (!verificaSelectIgual) {
                    attCampos["status_equip"] = select.options[select.selectedIndex].text
                }

                inputs.forEach((input, index) => {
                    const varificaInputIgual = inputs[index].value === infosCard[index + 1].innerText

                    if (!varificaInputIgual && index !== 2) {
                        console.log(attCampos.response);

                        attCampos.response[input.id] = input.value
                    }
                })

                if (Object.keys(attCampos.response).length !== 0) {
                    attCampos.id = infosCard[0].innerText.toLowerCase()

                    server.post("/edit_equipamento", { attCampos }).then(res => {
                        console.log(res);

                        if (res.status === 200) {
                            const popupFedback = document.querySelector('.screen-feedback')

                            document.querySelector('.text-feedback').innerText = res.data.msg
                            popupFedback.style.backgroundColor = 'oklch(52.7% 0.154 150.069)'
                            popupFedback.classList.add("aparece-feedback")

                            setTimeout(() => {
                                popupFedback.classList.remove("aparece-feedback")
                            }, 4000)
                        }

                        document.querySelector('.screen-edit-equip').classList.remove('aparece')
                    }).catch(erro => {
                        popupFedback.style.backgroundColor = 'oklch(44.4% 0.177 26.899)'
                        document.querySelector('.text-feedback').innerText = erro.response.data.msg
                        popupFedback.classList.add("aparece-feedback")

                        setTimeout(() => {
                            popupFedback.classList.remove("aparece-feedback")
                        }, 3000)
                    })
                }
            })
        })
    })
})

document.querySelector('.btn-historico').addEventListener('click', () => {
    abrePopup(document.querySelector(".container-historico"))

    const containerHistorico = document.querySelector('.lista-historico')
    const btnExit = document.getElementById('btn-exit-historico')

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
                    <p>Data: <span>${dataFormatBR} - ${hourFormatBR}</span></p>
                </div>
            </li>
        `
        })
    })

    btnExit.addEventListener('click', () => {
        fechaPopup(btnExit.parentElement)
    })
})

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