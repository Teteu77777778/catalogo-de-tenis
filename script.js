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
    // --- Lógica de Autenticação ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            try {
                await firebase.auth().signInWithEmailAndPassword(email, password);
                window.location.href = 'index.html';
            } catch (error) {
                alert('Erro ao fazer login: ' + error.message);
            }
        });
        return;
    }
    
    // Protege a página de gerenciamento de forma mais robusta
    const path = window.location.pathname;
    const isPublicPage = path.endsWith('catalogo.html') || path.endsWith('detalhes.html');
    const isLoginPage = path.endsWith('login.html');
    
    if (!isPublicPage && !isLoginPage) {
        firebase.auth().onAuthStateChanged(user => {
            if (!user) {
                window.location.href = 'login.html';
            }
        });
    }

    const formulario = document.getElementById('formulario-tenis');
    const colecaoTenis = db.collection("tenis");

    // --- Elementos da Página (Admin e Cliente) ---
    const filtroGeneroSelect = document.getElementById('filtro-genero');
    const filtroBuscaInput = document.getElementById('filtro-busca');
    const filtroNumeracaoSelect = document.getElementById('filtro-numeracao');
    const ordenarSelect = document.getElementById('ordenar-por');
    const btnAplicar = document.getElementById('btn-aplicar');
    
    const imagemFileInput = document.getElementById('imagem-file');
    const imagensAtuaisContainer = document.getElementById('imagens-atuais');
    
    const btnSubmit = document.getElementById('btn-submit');
    const btnCancelar = document.getElementById('btn-cancelar');
    const tenisIdInput = document.getElementById('tenis-id');

    let currentImageUrls = [];
    const whatsappNumber = "5511989806235";

    // --- Lógica do Lightbox ---
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.getElementsByClassName('close-btn')[0];

    if (closeBtn) {
        closeBtn.onclick = function() {
            lightbox.style.display = "none";
        }
    }
    
    function abrirLightbox(imageUrl) {
        lightbox.style.display = "block";
        lightboxImg.src = imageUrl;
    }

    // --- Parte 1: Gerenciamento (index.html) ---
    if (formulario) {
        formulario.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const tenisId = tenisIdInput.value;
            let finalImageUrls = [...currentImageUrls];

            const arquivos = imagemFileInput.files;

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
                                finalImageUrls.push(downloadURL);
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
                numeracoes: []
            };
            
            document.querySelectorAll('input[name="genero"]:checked').forEach(checkbox => {
                tenisData.generos.push(checkbox.value);
            });
            
            document.querySelectorAll('input[name="numeracao"]:checked').forEach(checkbox => {
                tenisData.numeracoes.push(parseInt(checkbox.value));
            });

            if (tenisId) {
                await colecaoTenis.doc(tenisId).update(tenisData);
            } else {
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
        imagemFileInput.value = '';
        if(imagensAtuaisContainer) imagensAtuaisContainer.innerHTML = '';
        currentImageUrls = [];
        document.querySelectorAll('input[name="genero"]').forEach(checkbox => checkbox.checked = false);
        document.querySelectorAll('input[name="numeracao"]').forEach(checkbox => checkbox.checked = false);
    }

    async function preencherFormulario(tenisId) {
        const doc = await colecaoTenis.doc(tenisId).get();
        if (doc.exists) {
            const tenis = doc.data();
            
            formulario.reset();
            
            document.getElementById('nome-tenis').value = tenis.nome;
            document.getElementById('valor-tenis').value = tenis.valor;
            document.getElementById('descricao-tenis').value = tenis.descricao;
            document.getElementById('modelo-tenis').value = tenis.modelo;
            
            document.querySelectorAll('input[name="genero"]').forEach(checkbox => {
                checkbox.checked = tenis.generos && tenis.generos.includes(checkbox.value);
            });
            
            document.querySelectorAll('input[name="numeracao"]').forEach(checkbox => {
                checkbox.checked = tenis.numeracoes && tenis.numeracoes.includes(parseInt(checkbox.value));
            });

            tenisIdInput.value = doc.id;
            btnSubmit.textContent = "Salvar Alterações";
            btnCancelar.style.display = 'inline-block';

            currentImageUrls = tenis.imagemUrls || [];
            renderizarImagensAtuais();
        }
    }

    function renderizarImagensAtuais() {
        if (!imagensAtuaisContainer) return;
        
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
                await removerImagem(tenisIdInput.value, url, index);
            });

            imgContainer.appendChild(img);
            imgContainer.appendChild(removeBtn);
            imagensAtuaisContainer.appendChild(imgContainer);
        });
    }

    async function removerImagem(tenisId, imageUrl, indexToRemove) {
        if (!tenisId) {
            console.error("ID do tênis não encontrado para remover a imagem.");
            return;
        }
        try {
            const imageRef = storage.refFromURL(imageUrl);
            await imageRef.delete();
        } catch (error) {
            console.error("Erro ao remover imagem do Storage:", error);
        }

        currentImageUrls.splice(indexToRemove, 1);
        await colecaoTenis.doc(tenisId).update({
            imagemUrls: currentImageUrls
        });
        renderizarImagensAtuais();
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
        
        // NOVO: Faz a filtragem por numeração no próprio JavaScript para contornar a limitação do Firebase
        const numeracaoSelecionada = filtroNumeracaoSelect ? filtroNumeracaoSelect.value : 'todos';

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
            
            // Filtro de numeração (agora em JavaScript)
            if (numeracaoSelecionada !== 'todos') {
                documentos = documentos.filter(doc => 
                    doc.numeracoes && doc.numeracoes.includes(parseInt(numeracaoSelecionada))
                );
            }
            
            // Filtro de Busca
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
        const catalogoContainer = document.getElementById('catalogo-container');
        if (!catalogoContainer) return;

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
            const numeracoesTexto = tenis.numeracoes ? tenis.numeracoes.join(', ') : 'Não especificado';

            let cardHTML = `
                <div class="imagem-container">
                    <img src="${primeiraImagem}" alt="Imagem do Tênis">
                </div>
                <h3>${tenis.nome}</h3>
                <p class="valor">R$ ${tenis.valor.toFixed(2).replace('.', ',')}</p>
                <p>${tenis.descricao}</p>
                <p><strong>Gênero:</strong> ${generosTexto}</p>
                <p><strong>Numeração:</strong> ${numeracoesTexto}</p>
                <p><strong>Modelo:</strong> ${tenis.modelo}</p>
            `;
            
            const whatsappMessage = `Olá! Gostaria de mais informações sobre o tênis '${tenis.nome}' (R$ ${tenis.valor.toFixed(2).replace('.', ',')}) que vi no seu catálogo. Poderia me ajudar?`;
            const whatsappLink = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(whatsappMessage)}`;
            
            cardHTML += `<a href="${whatsappLink}" target="_blank" class="btn-whatsapp">Comprar pelo WhatsApp</a>`;

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
        
        const lightbox = document.getElementById('lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        const closeBtn = document.getElementsByClassName('close-btn')[0];

        if (closeBtn) {
            closeBtn.onclick = function() {
                if(lightbox) lightbox.style.display = "none";
            }
        }
        
        function abrirLightbox(imageUrl) {
            if(lightbox && lightboxImg) {
                lightbox.style.display = "block";
                lightboxImg.src = imageUrl;
            }
        }


        if (tenisId) {
            colecaoTenis.doc(tenisId).get().then(doc => {
                if (doc.exists) {
                    const tenis = doc.data();
                    let imagensHtml = '';
                    if (tenis.imagemUrls && tenis.imagemUrls.length > 0) {
                         tenis.imagemUrls.forEach(url => {
                            imagensHtml += `<img src="${url}" alt="${tenis.nome}" class="thumbnail-galeria">`;
                        });
                    }
                    const generosTexto = tenis.generos ? tenis.generos.join(', ') : 'Não especificado';
                    const numeracoesTexto = tenis.numeracoes ? tenis.numeracoes.join(', ') : 'Não especificado';

                    detalhesContainer.innerHTML = `
                        <h2>${tenis.nome}</h2>
                        <p class="valor">R$ ${tenis.valor.toFixed(2).replace('.', ',')}</p>
                        <div class="imagens-galeria">
                            ${imagensHtml}
                        </div>
                        <p>${tenis.descricao}</p>
                        <p><strong>Gênero:</strong> ${generosTexto}</p>
                        <p><strong>Numeração:</strong> ${numeracoesTexto}</p>
                        <p><strong>Modelo:</strong> ${tenis.modelo}</p>
                        <a href="https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(`Olá! Gostaria de mais informações sobre o tênis '${tenis.nome}' (R$ ${tenis.valor.toFixed(2).replace('.', ',')}) que vi no seu catálogo. Poderia me ajudar?`)}" target="_blank" class="btn-whatsapp">Comprar pelo WhatsApp</a>
                    `;

                    document.querySelectorAll('.thumbnail-galeria').forEach(thumbnail => {
                        thumbnail.addEventListener('click', (e) => {
                            abrirLightbox(e.target.src);
                        });
                    });
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
