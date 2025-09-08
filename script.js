// A sua configuração do Firebase. Cole aqui o código que você já tem.
const firebaseConfig = {
  apiKey: "AIzaSyAGjMDZrYBtPlRH1WWzcCg1JCp26ICuViw",
  authDomain: "catalogo-de-tenis-6946e.firebaseapp.com",
  projectId: "catalogo-de-tenis-6946e",
  storageBucket: "catalogo-de-tenis-6946e.firebasestorage.app",
  messagingSenderId: "611720433921",
  appId: "1:611720433921:web:2d43c2b97a6bfa5753cb00",
  measurementId: "G-WY8S589PW1"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Conecta ao banco de dados Firestore e ao Storage
const db = firebase.firestore();
const storage = firebase.storage();

document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('formulario-tenis');
    const catalogoContainer = document.getElementById('catalogo-container');
    const colecaoTenis = db.collection("tenis");

    // --- Elementos da Página (Admin e Cliente) ---
    const filtroGeneroSelect = document.getElementById('filtro-genero');
    const filtroBuscaInput = document.getElementById('filtro-busca');
    const ordenarSelect = document.getElementById('ordenar-por');
    const btnAplicar = document.getElementById('btn-aplicar');
    
    const imagemFileInput = document.getElementById('imagem-file');
    const imagensAtuaisContainer = document.getElementById('imagens-atuais');
    
    const btnSubmit = document.getElementById('btn-submit');
    const btnCancelar = document.getElementById('btn-cancelar');
    const tenisIdInput = document.getElementById('tenis-id');

    let currentImageUrls = []; // Para armazenar as URLs das imagens ao editar

    // --- Parte 1: Gerenciamento (index.html) ---
    if (formulario) {
        formulario.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const tenisId = tenisIdInput.value;
            let finalImageUrls = [...currentImageUrls]; // Começa com as imagens já existentes

            const arquivos = imagemFileInput.files;

            // Se novas imagens foram selecionadas, faz o upload delas
            if (arquivos.length > 0) {
                const uploadPromises = [];
                for (let i = 0; i < arquivos.length; i++) {
                    const arquivo = arquivos[i];
                    const storageRef = storage.ref(`tenis-imagens/${Date.now()}_${arquivo.name}`);
                    const uploadTask = storageRef.put(arquivo);

                    const promise = new Promise((resolve, reject) => {
                        uploadTask.on(
                            firebase.storage.TaskEvent.STATE_CHANGED,
                            (snapshot) => {},
                            (error) => {
                                reject(error);
                            },
                            async () => {
                                const downloadURL = await storageRef.getDownloadURL();
                                finalImageUrls.push(downloadURL); // Adiciona as novas URLs
                                resolve();
                            }
                        );
                    });
                    uploadPromises.push(promise);
                }
                await Promise.all(uploadPromises);
            }

            const tenisData = {
                imagemUrls: finalImageUrls,
                nome: document.getElementById('nome-tenis').value,
                valor: parseFloat(document.getElementById('valor-tenis').value),
                descricao: document.getElementById('descricao-tenis').value,
                generos: [],
                modelo: document.getElementById('modelo-tenis').value,
            };
            
            document.querySelectorAll('input[name="genero"]:checked').forEach(checkbox => {
                tenisData.generos.push(checkbox.value);
            });

            if (tenisId) {
                // Se existe um ID, atualiza o documento existente
                await colecaoTenis.doc(tenisId).update(tenisData);
            } else {
                // Se não existe ID, adiciona um novo documento
                tenisData.timestamp = firebase.firestore.FieldValue.serverTimestamp();
                await colecaoTenis.add(tenisData);
            }

            formulario.reset();
            resetarFormulario();
        });

        btnCancelar.addEventListener('click', () => {
            formulario.reset();
            resetarFormulario();
        });
    }

    function resetarFormulario() {
        btnSubmit.textContent = "Adicionar Tênis";
        btnCancelar.style.display = 'none';
        tenisIdInput.value = '';
        imagemFileInput.value = ''; // Limpa o campo de arquivo
        imagensAtuaisContainer.innerHTML = ''; // Limpa as imagens de pré-visualização
        currentImageUrls = []; // Reseta as URLs de imagem atuais
    }

    // Função para preencher o formulário quando o botão de editar é clicado
    async function preencherFormulario(tenisId) {
        const doc = await colecaoTenis.doc(tenisId).get();
        if (doc.exists) {
            const tenis = doc.data();
            document.getElementById('nome-tenis').value = tenis.nome;
            document.getElementById('valor-tenis').value = tenis.valor;
            document.getElementById('descricao-tenis').value = tenis.descricao;
            document.getElementById('modelo-tenis').value = tenis.modelo;
            
            document.querySelectorAll('input[name="genero"]').forEach(checkbox => {
                checkbox.checked = tenis.generos.includes(checkbox.value);
            });

            tenisIdInput.value = doc.id;
            btnSubmit.textContent = "Salvar Alterações";
            btnCancelar.style.display = 'inline-block';

            // Carrega e exibe as imagens atuais
            currentImageUrls = tenis.imagemUrls || [];
            renderizarImagensAtuais();
        }
    }

    // Função para renderizar as imagens atuais na interface de edição
    function renderizarImagensAtuais() {
        imagensAtuaisContainer.innerHTML = '';
        if (currentImageUrls.length === 0) {
            imagensAtuaisContainer.innerHTML = '<p style="color:#777;">Nenhuma imagem atual.</p>';
            return;
        }

        currentImageUrls.forEach((url, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.classList.add('imagem-preview-container');
            
            const img = document.createElement('img');
            img.src = url;
            img.alt = `Imagem ${index + 1}`;

            const removeBtn = document.createElement('button');
            removeBtn.classList.add('remover-imagem-btn');
            removeBtn.textContent = 'X';
            removeBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                // Remove a imagem do Storage e atualiza o Firestore
                await removerImagem(tenisIdInput.value, url, index);
            });

            imgContainer.appendChild(img);
            imgContainer.appendChild(removeBtn);
            imagensAtuaisContainer.appendChild(imgContainer);
        });
    }

    // Função para remover uma imagem
    async function removerImagem(tenisId, imageUrl, indexToRemove) {
        // Remove do Storage
        try {
            const imageRef = storage.refFromURL(imageUrl);
            await imageRef.delete();
            console.log("Imagem removida do Storage:", imageUrl);
        } catch (error) {
            console.error("Erro ao remover imagem do Storage:", error);
            // Continua mesmo se a remoção do Storage falhar, para tentar remover do Firestore
        }

        // Remove do array de URLs e atualiza o Firestore
        currentImageUrls.splice(indexToRemove, 1);
        await colecaoTenis.doc(tenisId).update({
            imagemUrls: currentImageUrls
        });
        renderizarImagensAtuais(); // Re-renderiza a lista de imagens
    }


    // --- Parte 2: Lógica de Filtro, Busca e Ordenação ---
    function iniciarCatalogo() {
        let query = colecaoTenis;
        
        if (filtroGeneroSelect) {
            const generoSelecionado = filtroGeneroSelect.value;
            if (generoSelecionado !== 'todos') {
                query = query.where('generos', 'array-contains', generoSelecionado);
            }
        }
        
        if (ordenarSelect) {
            const ordem = ordenarSelect.value;
            query = query.orderBy('valor', ordem);
        } else {
            query = query.orderBy('timestamp', 'asc');
        }

        query.onSnapshot(snapshot => {
            let documentos = [];
            snapshot.forEach(doc => {
                documentos.push({ id: doc.id, ...doc.data() });
            });
            
            if (filtroBuscaInput) {
                const termoBusca = filtroBuscaInput.value.toLowerCase();
                documentos = documentos.filter(doc => 
                    doc.nome.toLowerCase().includes(termoBusca) || 
                    doc.modelo.toLowerCase().includes(termoBusca) ||
                    doc.descricao.toLowerCase().includes(termoBusca)
                );
            }

            renderizarCatalogo(documentos);
        });
    }

    // --- Parte 3: Renderiza os cartões do catálogo ---
    function renderizarCatalogo(documentos) {
        catalogoContainer.innerHTML = '';
        const contador = document.getElementById('contador-produtos');
        if (contador) {
            contador.textContent = `${documentos.length} produtos encontrados.`;
        }

        documentos.forEach(tenis => {
            const tenisCard = document.createElement('div');
            tenisCard.classList.add('tenis-card');
            
            const primeiraImagem = (tenis.imagemUrls && tenis.imagemUrls.length > 0) ? tenis.imagemUrls[0] : '';
            const generosTexto = tenis.generos ? tenis.generos.join(', ') : 'Não especificado';

            let cardHTML = `
                <img src="${primeiraImagem}" alt="Imagem do Tênis">
                <h3>${tenis.nome}</h3>
                <p class="valor">R$ ${tenis.valor.toFixed(2).replace('.', ',')}</p>
                <p>${tenis.descricao}</p>
                <p><strong>Gênero:</strong> ${generosTexto}</p>
                <p><strong>Modelo:</strong> ${tenis.modelo}</p>
            `;
            
            if (formulario) {
                cardHTML += `
                    <div class="btn-admin">
                        <button class="btn-editar" data-id="${tenis.id}">Editar</button>
                        <button class="btn-remover" data-id="${tenis.id}">Remover</button>
                    </div>
                `;
            }
            
            tenisCard.innerHTML = cardHTML;
            tenisCard.onclick = () => {
                window.location.href = `detalhes.html?id=${tenis.id}`;
            };
            catalogoContainer.appendChild(tenisCard);
            
            if (formulario) {
                const btnRemover = tenisCard.querySelector('.btn-remover');
                btnRemover.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    e.preventDefault();

                    // Antes de remover o documento, remove todas as imagens associadas
                    if (tenis.imagemUrls && tenis.imagemUrls.length > 0) {
                        const deleteImagePromises = tenis.imagemUrls.map(url => {
                            const imageRef = storage.refFromURL(url);
                            return imageRef.delete().catch(error => console.error("Erro ao remover imagem do Storage:", error));
                        });
                        await Promise.all(deleteImagePromises);
                    }
                    await colecaoTenis.doc(tenis.id).delete();
                });

                const btnEditar = tenisCard.querySelector('.btn-editar');
                btnEditar.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    preencherFormulario(tenis.id);
                });
            }
        });
    }

    // --- Lógica para a Página de Detalhes ---
    const detalhesContainer = document.getElementById('detalhes-produto');

    if (detalhesContainer) {
        const urlParams = new URLSearchParams(window.location.search);
        const tenisId = urlParams.get('id');

        if (tenisId) {
            colecaoTenis.doc(tenisId).get().then(doc => {
                if (doc.exists) {
                    const tenis = doc.data();
                    let imagensHtml = '';
                    if (tenis.imagemUrls && tenis.imagemUrls.length > 0) {
                         tenis.imagemUrls.forEach(url => {
                            imagensHtml += `<img src="${url}" alt="${tenis.nome}">`;
                        });
                    }

                    detalhesContainer.innerHTML = `
                        <h2>${tenis.nome}</h2>
                        <p class="valor">R$ ${tenis.valor.toFixed(2).replace('.', ',')}</p>
                        <div class="imagens-galeria">
                            ${imagensHtml}
                        </div>
                        <p>${tenis.descricao}</p>
                        <p><strong>Gênero:</strong> ${tenis.generos.join(', ')}</p>
                        <p><strong>Modelo:</strong> ${tenis.modelo}</p>
                    `;
                } else {
                    detalhesContainer.innerHTML = `<p>Produto não encontrado.</p>`;
                }
            }).catch(error => {
                detalhesContainer.innerHTML = `<p>Erro ao carregar detalhes do produto.</p>`;
            });
        } else {
            detalhesContainer.innerHTML = `<p>Nenhum produto selecionado.</p>`;
        }
    }
    
    // --- Adiciona os ouvintes de evento aos filtros e busca ---
    if (btnAplicar) {
        btnAplicar.addEventListener('click', iniciarCatalogo);
    }
    
    if (filtroBuscaInput) {
        let timeout = null;
        filtroBuscaInput.addEventListener('keyup', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                iniciarCatalogo();
            }, 500); 
        });
    }

    // Inicia a primeira vez
    iniciarCatalogo();
});
