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
    
    if (window.location.pathname.endsWith('index.html')) {
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
            let finalImageUrls = [...currentImageUrls]; // Começa com as imagens já existentes

            const arquivos = imagemFileInput.files;

            // Se houver novos arquivos, faz o upload e adiciona às URLs finais
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
                // Se o tenisId existe, é uma edição
                await colecaoTenis.doc(tenisId).update(tenisData);
            } else {
                // Caso contrário, é um novo item
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
        // Desmarcar todos os checkboxes de gênero e numeração
        document.querySelectorAll('input[name="genero"]').forEach(checkbox => checkbox.checked = false);
        document.querySelectorAll('input[name="numeracao"]').forEach(checkbox => checkbox.checked = false);
    }

    async function preencherFormulario(tenisId) {
        const doc = await colecaoTenis.doc(tenisId).get();
        if (doc.exists) {
            const tenis = doc.data();
            
            // Limpa o formulário APÓS carregar os dados, mas ANTES de preencher
            // E garante que o tenisIdInput esteja preenchido antes do reset
            tenisIdInput.value = doc.id; // Define o ID primeiro
            formulario.reset(); // Reseta os campos
            resetarFormulario(); // Garante que o estado seja limpo, mas mantém o tenisId

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
                // Passa o ID do tênis que está sendo editado para a função removerImagem
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
            // Continua mesmo se a imagem não for encontrada no storage, pois o importante é remover do DB
        }

        currentImageUrls.splice(indexToRemove, 1);
        await colecaoTenis.doc(tenisId).update({
            imagemUrls: currentImageUrls
        });
        renderizarImagensAtuais(); // Atualiza a exibição das imagens
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
        
        if (filtroNumeracaoSelect) {
            const numeracaoSelecionada = filtroNumeracaoSelect.value;
            if (numeracaoSelecionada !== 'todos') {
                query = query.where('numeracoes', 'array-contains', parseInt(numeracaoSelecionada));
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
        const catalogoContainer = document.getElementById('catalogo-container');
        if (!catalogoContainer) return;

        catalogoContainer.innerHTML = '';
        const contador = document.getElementById('contador-produtos');
        if (contador) {
            contador.textContent = `${documentos.length} produtos encontrados.`;
        }

        documentos.forEach(tenis => {
            const tenisCard = document.createElement('div');
            tenis
