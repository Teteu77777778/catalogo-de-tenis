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
    
    // --- Parte 1: Gerenciamento (index.html) ---
    if (formulario) {
        formulario.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const arquivos = imagemFileInput.files;
            if (arquivos.length === 0) return;

            const urls = [];
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
                            urls.push(downloadURL);
                            resolve();
                        }
                    );
                });
                uploadPromises.push(promise);
            }

            await Promise.all(uploadPromises);

            const novoTenis = {
                imagemUrls: urls,
                nome: document.getElementById('nome-tenis').value,
                valor: parseFloat(document.getElementById('valor-tenis').value),
                descricao: document.getElementById('descricao-tenis').value,
                genero: document.getElementById('genero-tenis').value,
                modelo: document.getElementById('modelo-tenis').value,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            await colecaoTenis.add(novoTenis);
            formulario.reset();
        });
    }

    // --- Parte 2: Lógica de Filtro, Busca e Ordenação ---
    function iniciarCatalogo() {
        let query = colecaoTenis;
        
        if (filtroGeneroSelect) {
            const generoSelecionado = filtroGeneroSelect.value;
            if (generoSelecionado !== 'todos') {
                query = query.where('genero', '==', generoSelecionado);
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
            
            // Verifica se o array de imagens existe
            const primeiraImagem = (tenis.imagemUrls && tenis.imagemUrls.length > 0) ? tenis.imagemUrls[0] : '';

            let cardHTML = `
                <img src="${primeiraImagem}" alt="Imagem do Tênis">
                <h3>${tenis.nome}</h3>
                <p class="valor">R$ ${tenis.valor.toFixed(2).replace('.', ',')}</p>
                <p>${tenis.descricao}</p>
                <p><strong>Gênero:</strong> ${tenis.genero}</p>
                <p><strong>Modelo:</strong> ${tenis.modelo}</p>
            `;
            
            if (formulario) {
                cardHTML += `<button class="btn-remover" data-id="${tenis.id}">Remover</button>`;
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
                    await colecaoTenis.doc(tenis.id).delete();
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
                        <p><strong>Gênero:</strong> ${tenis.genero}</p>
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
