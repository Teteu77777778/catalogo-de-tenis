document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('formulario-tenis');
    const catalogoContainer = document.getElementById('catalogo-container');
    
    const LOCAL_STORAGE_KEY = 'tenisCatalogo';
    
    // Função para carregar os tênis do LocalStorage e exibir na tela
    function carregarTenis(isEditor = false) { // isEditor indica se é a versão de gerenciamento
        const tenisSalvos = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
        
        catalogoContainer.innerHTML = '';
        
        tenisSalvos.forEach((tenis, index) => {
            adicionarTenisNoCatalogo(tenis, index, isEditor);
        });
    }

    // Função para adicionar o card na tela
    function adicionarTenisNoCatalogo(tenis, index, isEditor) {
        const tenisCard = document.createElement('div');
        tenisCard.classList.add('tenis-card');
        
        // Estrutura HTML do card
        let cardHTML = `
            <img src="${tenis.imagemUrl}" alt="Imagem do Tênis">
            <h3>${tenis.nome}</h3>
            <p class="valor">R$ ${tenis.valor.toFixed(2).replace('.', ',')}</p>
            <p>${tenis.descricao}</p>
        `;
        
        // Se for a versão de gerenciamento, adiciona o botão de remover
        if (isEditor) {
            cardHTML += `<button class="btn-remover" data-index="${index}">Remover</button>`;
        }
        
        tenisCard.innerHTML = cardHTML;
        catalogoContainer.appendChild(tenisCard);
        
        // Adiciona o evento de clique ao botão, se ele existir
        if (isEditor) {
            const btnRemover = tenisCard.querySelector('.btn-remover');
            btnRemover.addEventListener('click', () => {
                removerTenis(index);
            });
        }
    }
    
    // Função para remover o tênis
    function removerTenis(index) {
        const tenisSalvos = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
        
        // Remove o item do array com base no seu índice
        tenisSalvos.splice(index, 1);
        
        // Salva a lista atualizada no LocalStorage
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tenisSalvos));
        
        // Recarrega a página para refletir a mudança
        carregarTenis(true); 
    }
    
    // Adiciona um evento para o formulário
    if (formulario) {
        formulario.addEventListener('submit', (e) => {
            e.preventDefault();

            const novoTenis = {
                imagemUrl: document.getElementById('imagem-url').value,
                nome: document.getElementById('nome-tenis').value,
                valor: parseFloat(document.getElementById('valor-tenis').value),
                descricao: document.getElementById('descricao-tenis').value
            };
            
            const tenisSalvos = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
            tenisSalvos.push(novoTenis);
            
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tenisSalvos));
            
            // Recarrega o catálogo para exibir a versão atualizada
            carregarTenis(true);
            formulario.reset();
        });
        // Carrega o catálogo na versão de gerenciamento
        carregarTenis(true);
    } else {
        // Carrega o catálogo na versão do cliente (sem o botão de remover)
        carregarTenis(false);
    }
});