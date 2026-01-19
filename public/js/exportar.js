
document.addEventListener("DOMContentLoaded", async () => {
  const dateInput = document.getElementById("dateInput");
  const timeInput = document.getElementById("timeInput");
  const tableContainer = document.getElementById("tableContainer");
  const toast = document.getElementById("toast");

  // Toast
  const showToast = (msg, error = false) => {
    toast.textContent = msg;
    toast.className = "toast show" + (error ? " error" : "");
    setTimeout(() => toast.classList.remove("show"), 4000);
  };

  // Carregar dados do inventário com JOIN
    const loadInventory = async () => {
        try {
            tableContainer.innerHTML = "<div class='loading'>Carregando contagem do dia...</div>";

            const res = await fetch("/api/inventory/exportToday");
            if (!res.ok) throw new Error("Erro na rede");

            const items = await res.json();

            if (items.length === 0) {
            tableContainer.innerHTML = "<div class='loading'>Nenhum item contado hoje.</div>";
            return;
            }

            renderTable(items);
        } catch (err) {
            showToast("Erro ao carregar contagem", true);
            tableContainer.innerHTML = "<div class='loading error'>Falha ao carregar dados</div>";
        }
    };

    const renderTable = (items) => {
        let html = `
            <table>
            <thead>
                <tr>
                <th><input type="checkbox" id="selectAll"></th>
                <th>Código</th>
                <th>Produto</th>
                <th>Sistema</th>
                <th>Contado</th>
                <th>Diferença</th>
                </tr>
            </thead>
            <tbody>
        `;

        items.forEach((item, index) => {
            const diff = item.diferenca;
            const diffClass = diff > 0 ? "dif-positiva" : diff < 0 ? "dif-negativa" : "dif-zero";

            html += `
            <tr>
                <td><input type="checkbox" class="row-check" data-index="${index}"></td>
                <td><code>${item.codigo}</code></td>
                <td><strong>${item.produto}</strong></td>
                <td>${parseFloat(item.sistema)}</td>
                <td><strong>${parseFloat(item.contada)}</strong></td>
                <td class="${diffClass}"><strong>${diff > 0 ? '+' : ''}${diff}</strong></td>
            </tr>
            `;
        });

        html += `</tbody></table>`;
        tableContainer.innerHTML = html;

        // Select All
        document.getElementById("selectAll").addEventListener("change", (e) => {
            document.querySelectorAll(".row-check").forEach(cb => cb.checked = e.target.checked);
        });
    };

    // Exportar TXT to CipherLab
    document.getElementById("exportTxtBtn").onclick = async () => {
        const selectedDate = dateInput.value;

        if (!selectedDate) {
            return showToast("Selecione a data do inventário!", true);
        }

        try {
            const res = await fetch(`/api/inventoryExport`);
            if (!res.ok) throw new Error("Falha ao buscar dados para exportação");

            const items = await res.json();

            if (items.length === 0) {
            return showToast("Nenhum produto encontrado para esta data", true);
            }

            let content = "";

            items.forEach(item => {
            const codigo = (item.codigo || "").toString().trim();
            const qtdContada = Number(item.quantidade_contada || 0);

            if (!codigo) return; // segurança

            const codigo13 = codigo.padStart(13, "0");
            const qtdMl = Math.round(qtdContada);
            const qtd12 = String(qtdMl).padStart(6, "0") + "000000";

            let dataFormatada, horaFormatada;

            if (item.data_hora) {
                // Produto foi contado → usa data/hora real
                const dt = new Date(item.data_hora);
                const dia = String(dt.getDate()).padStart(2, '0');
                const mes = String(dt.getMonth() + 1).padStart(2, '0');
                const ano = String(dt.getFullYear()).slice(-2);
                dataFormatada = `${dia}/${mes}/${ano}`;

                const hora = String(dt.getHours()).padStart(2, '0');
                const minuto = String(dt.getMinutes()).padStart(2, '0');
                horaFormatada = `${hora}:${minuto}:00`;
            } else {
                // Produto NÃO foi contado → usa data do filtro + hora padrão (ou meia-noite, 23:59, etc.)
                const [ano, mes, dia] = selectedDate.split("-");
                dataFormatada = `${dia}/${mes}/${ano.slice(-2)}`;
                horaFormatada = "23:59:00"; // ou "00:00:00" — escolha o que faz mais sentido no seu fluxo
            }

            content += `${codigo13} ${qtd12} ${dataFormatada}${horaFormatada}\n`;
            });

            if (!content) {
            return showToast("Nenhum item válido para exportar", true);
            }

            // Download
            const blob = new Blob([content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `INVENTARIO_${selectedDate.replace(/-/g, "")}_COMPLETO.txt`;
            a.click();
            URL.revokeObjectURL(url);

            showToast(`Exportado: ${items.length} produtos (contados + não contados)`);

        } catch (err) {
            console.error(err);
            showToast("Erro ao gerar arquivo de exportação", true);
        }
    };

  // Exportar Excel
    document.getElementById("exportExcelBtn").onclick = () => {
        const date = dateInput.value;
        if (!date) return showToast("Selecione a data!", true);

        const checkedRows = document.querySelectorAll(".row-check:checked");
        if (checkedRows.length === 0) return showToast("Selecione pelo menos um item!", true);

        const data = [];
        checkedRows.forEach(cb => {
            const row = cb.closest("tr");
            const cells = row.querySelectorAll("td");
            data.push({
            Código: cells[1].textContent.trim(),
            Produto: cells[2].textContent.trim(),
            Sistema: parseFloat(cells[3].textContent).toFixed(3),
            Contado: parseFloat(cells[4].textContent).toFixed(3),
            Diferença: cells[5].textContent.trim()
            });
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Selecionados");
        XLSX.writeFile(wb, `Contagem_Selecionados_${date}.xlsx`);

        showToast(`Excel exportado: ${checkedRows.length} itens!`);
    };

  // Carrega ao abrir
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
  timeInput.value = "23:59";
  loadInventory();
});