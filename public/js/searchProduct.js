// public/js/searchProduct.js
document.addEventListener("DOMContentLoaded", async () => {
  const searchInput = document.getElementById("searchInput");
  const productList = document.getElementById("productList");
  const resultsCount = document.getElementById("resultsCount");
  const noResults = document.getElementById("noResults");
  const toast = document.getElementById("toast");
  const closeBtn = document.getElementById("closeBtn");

  let allProducts = [];

  // Toast
  const showToast = (msg, error = false) => {
    toast.textContent = msg;
    toast.className = "toast show" + (error ? " error" : "");
    setTimeout(() => toast.classList.remove("show"), 3000);
  };

  // Margin format adjustment
  const formatarMargem = (margemDecimal) => {
    const margem = parseFloat(margemDecimal);
    // if (isNaN(margem) || margem <= 0) {
    //     return `<span style="color:#9ca3af">—</span>`;
    // }

    const porcentagem = (margem * 100).toFixed(2);
    let cor = "#ef4444"; // vermelho
    if (margem >= 0.45) cor = "#10b981";     // verde (45%+)
    else if (margem >= 0.30) cor = "#f59e0b"; // amarelo (30–45%)

    return `<strong style="color:${cor}; font-size:1.1em">${porcentagem}%</strong>`;
  };

  // Carregar todos os produtos
  const loadProducts = async () => {
    try {
      const res = await fetch("/api/products");
      allProducts = await res.json();
      console.log("Produtos carregados:", allProducts);
      displayProducts(allProducts);
    } catch (err) {
      showToast("Erro ao carregar produtos", true);
    }
  };

  // Filtrar e exibir
  const displayProducts = (products) => {
    productList.innerHTML = "";

    if (products.length === 0) {
      noResults.classList.remove("hidden");
      resultsCount.textContent = "0 produtos encontrados";
      return;
    }

    noResults.classList.add("hidden");
    resultsCount.textContent = `${products.length} produto${products.length > 1 ? 's' : ''} encontrado${products.length > 1 ? 's' : ''}`;

    products.forEach(product => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td><code>${product.codigo}</code></td>
        <td><strong>${product.produto}</strong></td>
        <td class="hide-mobile">${product.codigo_de_barras || "-"}</td>
        <td>${(product.atual || 0)}</td>
        <td class="hide-mobile">${(product.venda || 0).toFixed(2)}</td>
        <td class="hide-mobile">${formatarMargem(product.margem)}</td>
      `;

        row.onclick = () => {
        // Envia o produto de volta para a aba pai
        window.opener?.postMessage({
            type: "PRODUCT_SELECTED",
            codigo: product.codigo,
            codigo_de_barras: product.codigo_de_barras || ""
        }, window.location.origin);

        // Fecha a aba atual
        window.close();

        // Se não fechar (alguns navegadores bloqueiam), mostra mensagem
        setTimeout(() => {
            if (!document.hidden) {
            alert("Produto selecionado! Você pode fechar esta aba.");
            }
        }, 300);
        };

      productList.appendChild(row);
    });
  };

  // Busca em tempo real
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();

    if (query === "") {
      displayProducts(allProducts);
      return;
    }

    const filtered = allProducts.filter(p =>
      p.produto?.toLowerCase().includes(query) ||
      p.codigo?.toString().includes(query) ||
      p.codigo_de_barras?.toString().includes(query) ||
      p.codigo_de_barras_sec?.toString().includes(query)
    );

    displayProducts(filtered);
  });

  // Fechar com ESC ou botão
  closeBtn.onclick = () => window.close();
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") window.close();
  });

  // Foco automático
  searchInput.focus();

  // Carregar
  loadProducts();
});