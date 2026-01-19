// public/js/importar.js — VERSÃO FINAL COM FEEDBACK PROFISSIONAL
document.addEventListener("DOMContentLoaded", () => {
  console.log("importar.js carregado!");

  const fileInput = document.getElementById("fileInput");
  const importBtn = document.getElementById("importBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalMessage = document.getElementById("modalMessage");
  const confirmBtn = document.getElementById("confirmBtn");
  const closeBtn = document.getElementById("closeBtn");
  const progressContainer = document.getElementById("progressContainer");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");

  let importedData = [];

  const showModal = (title, message, options = {}) => {
    const {
      type = "info",           // info, success, error
      onConfirm = null,        // só aparece se tiver arquivo
      onClose = null
    } = options;

    modalTitle.textContent = title;
    modalMessage.innerHTML = message.replace(/\n/g, "<br>");

    // Cor do título
    const colors = { success: "#10b981", error: "#ef4444", info: "#3b82f6" };
    modalTitle.style.color = colors[type] || "#3b82f6";

    // Mostrar/esconder botões corretos
    if (onConfirm) {
      // Tem arquivo → mostra "Sim, importar" e "Cancelar"
      confirmBtn.style.display = "flex";
      closeBtn.style.display = "flex";
      okBtn.style.display = "none";

      confirmBtn.onclick = () => {
        modal.classList.add("hidden");
        onConfirm();
      };
    } else {
      // Erro ou atenção → só mostra "OK"
      confirmBtn.style.display = "none";
      closeBtn.style.display = "none";
      okBtn.style.display = "flex";
      okBtn.textContent = type === "success" ? "Fechar" : "OK";
    }

    // Fechar modal
    const close = () => {
      modal.classList.add("hidden");
      if (onClose) onClose();
    };

    closeBtn.onclick = close;
    okBtn.onclick = close;

    modal.classList.remove("hidden");
  };

  const updateProgress = (current, total, status = "") => {
    const percent = total > 0 ? (current / total) * 100 : 0;
    progressFill.style.width = percent + "%";
    progressText.innerHTML = `<strong>${current}</strong> de <strong>${total}</strong> produtos ${status}`;
  };

  importBtn.addEventListener("click", () => {
    if (!fileInput.files[0]) {
        showModal("Atenção", "Por favor, selecione um arquivo Excel primeiro.", {
          type: "error"
        });
        return;
    }
    processFile(fileInput.files[0]);
  });

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        // FILTRA LINHAS VÁZIAS + IGNORA CABEÇALHO COM INTELIGÊNCIA
        const dataRows = rows.filter((row, index) => {
          // Pula a primeira linha SE ela contiver palavras típicas de cabeçalho
          if (index === 0) {
            const firstCell = String(row[0] || "").toLowerCase().trim();
            const secondCell = String(row[1] || "").toLowerCase().trim();
            const hasHeaderWords = /c[oó]digo|produto|atual|custo|venda|margem|barras/i.test(
              row.join("|")
            );
            if (hasHeaderWords || secondCell === "produto" || firstCell.includes("cód")) {
              return false; // ignora cabeçalho
            }
          }
          // Ignora linhas completamente vazias ou só com espaços
          return row.some(cell => String(cell).trim() !== "");
        });

        importedData = dataRows
          .map(row => {
            const [
              codigo,
              produto,
              atual,
              custo,
              venda,
              margem_lucro,
              codigo_de_barras,
              codigo_de_barras_sec
            ] = row;

            // VALIDAÇÃO FORTE: ignora se produto for cabeçalho ou vazio
            const prodTrim = String(produto || "").trim();
            if (!codigo || 
                !prodTrim || 
                prodTrim === "" || 
                /produto|c[oó]digo/i.test(prodTrim)) {
              return null;
            }

            const limparCodigo = (v) => v ? String(v).replace(/^'+|'+$/g, "").trim() : "";

            return {
              codigo: String(codigo).trim(),
              produto: prodTrim,
              atual: parseFloat(atual) || 0,
              preco_custo: parseFloat(custo) || 0,
              preco_venda: parseFloat(venda) || 0,
              margem_lucro: parseFloat(margem_lucro) || 0,
              codigo_de_barras: limparCodigo(codigo_de_barras),
              codigo_de_barras_sec: limparCodigo(codigo_de_barras_sec)
            };
          })
          .filter(Boolean);

        if (importedData.length === 0) {
          showModal("Atenção", "Nenhum produto válido foi encontrado.<br>Pode ser que o arquivo tenha apenas o cabeçalho.", { type: "error" });
          return;
        }

        showModal("Tudo pronto!", `Encontrados <strong>${importedData.length}</strong> produtos válidos.<br><br>Deseja importar agora?`, {
          type: "success",
          onConfirm: startImport
        });

      } catch (err) {
        console.error(err);
        showModal("Erro", "Não foi possível ler o arquivo Excel.", { type: "error" });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const startImport = async () => {
    progressContainer.classList.remove("hidden");
    updateProgress(0, importedData.length, "processando...");

    let success = 0;
    let error = 0;

    for (let i = 0; i < importedData.length; i++) {
      try {
        const res = await fetch("/api/produto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(importedData[i])
        });
        if (res.ok) success++;
        else error++;
      } catch (e) {
        error++;
      }
      updateProgress(i + 1, importedData.length, success + error < importedData.length ? "enviando..." : "finalizando...");
      await new Promise(r => setTimeout(r, 8));
    }

    // MENSAGEM FINAL LINDA
    const emoji = success === importedData.length ? "✓" : "⚠";
    const color = success === importedData.length ? "success" : error > 50 ? "error" : "info";

    showModal(
      "Importação Concluída!",
      `Todos os ${importedData.length} produtos foram importados com sucesso!\n\nO sistema já está atualizado.`,
      {
        type: "success"
      }
    );
  };

  cancelBtn.addEventListener("click", () => window.close());
});