
document.addEventListener("DOMContentLoaded", async () => {
  // === ELEMENTOS DA TELA ===
  const productCodeInput = document.getElementById("productCode");
  const productDescription = document.getElementById("productDescription");
  const productQuantity = document.getElementById("productQuantity");
  const productConf = document.getElementById("productConf");
  const productDif = document.getElementById("productDif");
  const inventarioQtdInput = document.getElementById("inventarioQtd");
  const registerBtn = document.getElementById("registerBtn");
  const searchBtn = document.getElementById("searchBtn");
  const barcodeScanner = document.getElementById("barcodeScanner");
  const newInventoryBtn = document.getElementById("newInventory");
  const inventoryTableBody = document.querySelector("#inventoryTable tbody");
  const totalItemsSpan = document.getElementById("totalItems");

  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalMessage = document.getElementById("modalMessage");
  const confirmBtn = document.getElementById("confirmBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const okBtn = document.getElementById("okBtn");
  const toast = document.getElementById("toast");

  // === FUNÇÃO TOAST MODERNA ===
  const showToast = (message, isError = false) => {
    toast.textContent = message;
    toast.className = "toast show";
    if (isError) toast.classList.add("error");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  };

  // === MODAL INTELIGENTE ===
  const showModal = (title, message, options = {}) => {
    const { type = "info", onConfirm = null, onClose = null } = options;

    modalTitle.textContent = title;
    modalMessage.innerHTML = message.replace(/\n/g, "<br>");

    // Cores do título
    const colors = { success: "#10b981", error: "#ef4444", warning: "#f59e0b", info: "#3b82f6" };
    modalTitle.style.background = `linear-gradient(135deg, ${colors[type] || "#3b82f6"}, #8b5cf6)`;
    modalTitle.style.webkitBackgroundClip = "text";
    modalTitle.style.backgroundClip = "text";
    modalTitle.style.webkitTextFillColor = "transparent";

    // Botões
    if (onConfirm) {
      confirmBtn.style.display = "flex";
      cancelBtn.style.display = "flex";
      okBtn.style.display = "none";
      confirmBtn.onclick = () => { modal.classList.add("hidden"); onConfirm(); };
    } else {
      confirmBtn.style.display = "none";
      cancelBtn.style.display = "none";
      okBtn.style.display = "flex";
      okBtn.textContent = type === "success" ? "Fechar" : "OK";
    }

    cancelBtn.onclick = okBtn.onclick = () => {
      modal.classList.add("hidden");
      if (onClose) onClose();
    };

    modal.classList.remove("hidden");
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

  // === CARREGAR ITENS DO INVENTÁRIO ===
  const loadInventoryData = async () => {
    try {
      const res = await fetch("/api/inventoryCompaction");
      const items = await res.json();

      inventoryTableBody.innerHTML = "";
      totalItemsSpan.textContent = `${items.length} itens`;

      items.forEach(item => {
        const row = document.createElement("tr");

        const diff = (item.quantidade_contada || 0) - (item.atual || 0);
        const diffColor = diff > 0 ? "#10b981" : diff < 0 ? "#ef4444" : "#6b7280";

        row.innerHTML = `
          <td class="editable-qtd" 
                data-codigo="${item.codigo}" 
                data-data="${item.data_hora}"
                title="Clique para editar">
            <strong>${(item.quantidade_contada || 0)}</strong>
          </td>
          <td><code>${item.codigo}</code></td>
          <td><strong>${item.produto}</strong></td>
          <td class="mobile-hide">${(item.preco_custo || 0).toFixed(2)}</td>
            <td class="mobile-hide">${(item.preco_venda || 0).toFixed(2)}</td>
          <td class="mobile-hide">${formatarMargem(item.margem_lucro)}</td>
          <td>
            <button class="delete-btn" data-codigo="${item.codigo}" data-data="${item.data_hora}">
              <i data-feather="trash-2"></i>
            </button>
          </td>
        `;

        // Diferença colorida na linha
        if (diff !== 0) {
          row.style.background = diff > 0 ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)";
        }

        inventoryTableBody.appendChild(row);
        // Ativa edição direta na quantidade
        row.querySelector(".editable-qtd")?.addEventListener("click", function () {
        tornarEditavel(this);
        });
        row.querySelector(".editable-qtd").style.cursor = "pointer";
      });

      feather.replace();
      bindDeleteButtons();
    } catch (err) {
      showToast("Erro ao carregar inventário.", true);
    }
  };

  // === VINCULAR BOTÕES DE EXCLUIR ===
  const bindDeleteButtons = () => {
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.onclick = async () => {
        const codigo = btn.dataset.codigo;
        const data = btn.dataset.data;

        showModal("Remover Item", `Tem certeza que deseja remover este item do inventário?`, {
          type: "warning",
          onConfirm: async () => {
            try {
              await fetch(`/api/removeInventoryItem/${codigo}/${data}`, { method: "DELETE" });
              showToast("Item removido com sucesso!");
              loadInventoryData();
              clearForm();
            } catch {
              showToast("Erro ao remover item.", true);
            }
          }
        });
      };
    });
  };

  // === EDIÇÃO DIRETA DA QUANTIDADE NA TABELA ===
    const tornarEditavel = (cell) => {
    const valorAtual = parseFloat(cell.textContent) || 0;
    const codigo = cell.dataset.codigo;
    const dataHora = cell.dataset.data;

    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.01";
    input.value = valorAtual;
    input.style.width = "80px";
    input.style.fontWeight = "bold";
    input.style.textAlign = "center";
    input.style.border = "2px solid #3b82f6";
    input.style.borderRadius = "8px";
    input.style.padding = "4px";

    cell.innerHTML = "";
    cell.appendChild(input);
    input.focus();
    input.select();

    const salvar = async () => {
        const novoValor = parseFloat(input.value);
        if (isNaN(novoValor) || novoValor < 0) {
        showToast("Quantidade inválida!", true);
        cell.innerHTML = `<strong>${valorAtual}</strong>`;
        return;
        }

        try {
        const res = await fetch("/api/updateInventoryQuantity", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            codigo,
            data_hora: dataHora,
            quantidade_contada: novoValor
            })
        });

        if (res.ok) {
            cell.innerHTML = `<strong>${novoValor.toFixed(2)}</strong>`;
            showToast("Quantidade atualizada!", false);
            loadInventoryData(); // recarrega pra atualizar diferença e total
        } else {
            throw new Error();
        }
        } catch (err) {
        showToast("Erro ao salvar!", true);
        cell.innerHTML = `<strong>${valorAtual.toFixed(2)}</strong>`;
        }
    };

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
        e.preventDefault();
        salvar();
        }
        if (e.key === "Escape") {
        cell.innerHTML = `<strong>${valorAtual.toFixed(2)}</strong>`;
        }
    });

    input.addEventListener("blur", salvar);
    };

    // Ativa edição ao clicar na célula
    document.querySelectorAll(".editable-qtd").forEach(cell => {
    cell.style.cursor = "pointer";
    cell.addEventListener("click", () => tornarEditavel(cell));
    });

  // === BUSCAR PRODUTO ===
  const searchProduct = async () => {
    const code = productCodeInput.value.trim();
    if (!code) return showToast("Digite um código.", true);

    try {
      const res = await fetch(`/api/searchProduct?code=${code}`);
      const product = await res.json();

      if (!product || !product.codigo) {
        showToast("Produto não encontrado!", true);
        clearProductInfo();
        return;
      }

      // Preenche info
      productDescription.textContent = product.produto || "Sem descrição";
      productQuantity.textContent = (product.atual || 0).toFixed(2);

      // Atualiza conferido
      const confRes = await fetch(`/api/totalQuantityCounted/${product.codigo}`);
      const confData = await confRes.json();
      const conferido = (confData.totalQuantityCounted || 0).toFixed(2);
      productConf.textContent = conferido;

      // Diferença
      const diff = parseFloat(conferido) - parseFloat(product.atual || 0);
      productDif.innerHTML = `<strong style="color: ${diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#6b7280'}">
        ${diff >= 0 ? "+" : ""}${diff.toFixed(2)}
      </strong>`;

      // Salva dados temporários
      productCodeInput.dataset.codigo = product.codigo;
      productCodeInput.dataset.barcode = product.codigo_de_barras || "";

      inventarioQtdInput.focus();
      inventarioQtdInput.select();
    } catch (err) {
      showToast("Erro na busca.", true);
      clearProductInfo();
    }
  };

  // === REGISTRAR CONTAGEM ===
  const registerInventory = async () => {
    const qtd = parseFloat(inventarioQtdInput.value);
    const codigo = productCodeInput.dataset.codigo;

    if (!codigo || isNaN(qtd) || qtd < 0) {
      showToast("Preencha a quantidade corretamente.", true);
      return;
    }

    try {
      await fetch("/api/registerInventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo,
          codigo_de_barras: productCodeInput.dataset.barcode,
          produto: productDescription.textContent,
          quantidade_contada: qtd
        })
      });

      showToast(`Registrado: ${qtd} unidades!`);
      clearForm();
      loadInventoryData();
    } catch (err) {
      showToast("Erro ao registrar.", true);
    }
  };

  // === LIMPAR FORMULÁRIO ===
  const clearForm = () => {
    productCodeInput.value = "";
    inventarioQtdInput.value = "";
    delete productCodeInput.dataset.codigo;
    delete productCodeInput.dataset.barcode;
    clearProductInfo();
    productCodeInput.focus();
  };

  const clearProductInfo = () => {
    productDescription.textContent = "Selecione um produto";
    productQuantity.textContent = "0";
    productConf.textContent = "0";
    productDif.innerHTML = "<strong>0</strong>";
  };

  // === NOVO INVENTÁRIO (LIMPAR TUDO DO DIA) ===
  newInventoryBtn.onclick = () => {
    showModal("Novo Inventário", "Isso vai <strong>apagar todos os itens contados hoje</strong>.<br><br>Tem certeza?", {
      type: "warning",
      onConfirm: async () => {
        try {
          await fetch("/api/clearInventory", { method: "DELETE" });
          showToast("Novo inventário iniciado!");
          loadInventoryData();
          clearForm();
        } catch {
          showToast("Erro ao limpar inventário.", true);
        }
      }
    });
  };

  // === EVENTOS ===
  searchBtn.onclick = searchProduct;
  registerBtn.onclick = registerInventory;
  barcodeScanner.onclick = () => window.open("/leitor-codigos", "_blank");

  productCodeInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchProduct();
    }
  });

  inventarioQtdInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      registerInventory();
    }
  });

  // F10 = Registrar
  document.addEventListener("keydown", e => {
    if (e.key === "F10") {
      e.preventDefault();
      registerInventory();
    }
  });


  function searchProductInNewTab() {
    const searchTab = window.open("/pesquisar-produtos", "_blank");

    if (!searchTab) {
        showToast("Permitir pop-ups/novas abas para este site", true);
        return;
    }

    // Fica ouvindo mensagem do filho (a página de busca)
    const handleMessage = (event) => {
        // Segurança: aceita só da nossa origem
        if (event.origin !== window.location.origin) return;

        if (event.data && event.data.type === "PRODUCT_SELECTED") {
        const { codigo, codigo_de_barras } = event.data;

        // Preenche o campo e busca automaticamente
        productCodeInput.value = codigo_de_barras || codigo;
        searchProduct();

        // Traz foco de volta para esta aba
        window.focus();

        // Remove o listener
        window.removeEventListener("message", handleMessage);
        }
    };

    window.addEventListener("message", handleMessage);
  }

  // === LISTENER UNIVERSAL: Recebe produto do leitor ou da busca em nova aba/tabela ===
  window.addEventListener("message", (event) => {
    // Security: only accept messages from same origin
    if (event.origin !== window.location.origin) return;

    const data = event.data;

    // Only react to our custom message
    if (data && data.type === "PRODUCT_SELECTED") {
      const { codigo, codigo_de_barras } = data;

      const codeToUse = codigo_de_barras || codigo || "";
      if (!codeToUse) {
        showToast("Código inválido recebido.", true);
        return;
      }

      // Preenche e busca automaticamente
      productCodeInput.value = codeToUse;
      searchProduct().then(() => {
        setTimeout(() => {
          inventarioQtdInput.focus();
          inventarioQtdInput.select();
        }, 200);
      }).catch(() => {
        clearProductInfo();
        showToast("Produto não encontrado.", true);
      });

      // Bring window to front (works in most browsers)
      window.focus();
    }
  });

  // === ABRIR BUSCA DE PRODUTO EM NOVA ABA (com retorno automático) ===
  document.getElementById("searchProductBtn").addEventListener("click", () => {
  // Abre em nova aba
    searchProductInNewTab();
  });

  // F2 = Procurar
  document.addEventListener("keydown", e => {
    if (e.key === "F2") {
      e.preventDefault();
      searchProductInNewTab();
    }
  });

  // Inicia
  loadInventoryData();
  productCodeInput.focus();
});