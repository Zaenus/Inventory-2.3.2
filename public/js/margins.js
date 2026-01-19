document.addEventListener("DOMContentLoaded", async () => {
  const tableContainer = document.getElementById("tableContainer");
  const searchInput = document.getElementById("searchInput");
  const totalEl = document.getElementById("totalProducts");
  const avgEl = document.getElementById("avgMargin");
  const badEl = document.getElementById("badMargin");
  const toast = document.getElementById("toast");

  let allProducts = [];

  const showToast = (msg, error = false) => {
    toast.textContent = msg;
    toast.className = "toast show" + (error ? " error" : "");
    setTimeout(() => toast.classList.remove("show"), 4000);
  };

  // FUNÇÃO MÁGICA QUE CONSERTA QUALQUER NÚMERO BRASILEIRO
  const toNumber = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value;
    const cleaned = String(value).trim().replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const renderTable = (products) => {
    if (products.length === 0) {
      tableContainer.innerHTML = "<div class='loading'>Nenhum produto encontrado</div>";
      return;
    }

    let html = `
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Produto</th>
            <th style="text-align:right">Custo</th>
            <th style="text-align:right">Venda</th>
            <th style="text-align:center">Margem %</th>
          </tr>
        </thead>
        <tbody>
    `;

    products.forEach(p => {
      const custo = toNumber(p.custo);
      const venda = toNumber(p.venda);
      const margem = toNumber(p.margem) * 100;

      let margemClass = "baixa";
      if (margem >= 60) margemClass = "excelente";
      else if (margem >= 50) margemClass = "boa";
      else if (margem >= 40) margemClass = "media";

      html += `
        <tr>
          <td><code>${p.codigo || ''}</code></td>
          <td><strong>${p.produto || 'Sem nome'}</strong></td>
          <td style="text-align:right">R$ ${custo.toFixed(2)}</td>
          <td style="text-align:right">R$ ${venda.toFixed(2)}</td>
          <td class="margem ${margemClass}">${margem.toFixed(1)}%</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    tableContainer.innerHTML = html;
  };

  const updateSummary = (products) => {
    const validos = products.filter(p => {
      const venda = toNumber(p.venda);
      return venda > 0;
    });

    totalEl.textContent = validos.length;

    if (validos.length === 0) {
      avgEl.textContent = "0,0%";
      badEl.textContent = "0";
      return;
    }

    const somaMargem = validos.reduce((acc, p) => {
      const custo = toNumber(p.custo);
      const venda = toNumber(p.venda);
      const margem = (venda > 0 ? ((venda - custo) / venda) : 0);
      return acc + margem;
    }, 0);

    const media = (somaMargem / validos.length) * 100;
    avgEl.textContent = media.toFixed(1) + "%";

    const abaixo20 = validos.filter(p => {
      const custo = toNumber(p.custo);
      const venda = toNumber(p.venda);
      return venda > 0 && ((venda - custo) / venda) < 0.30;
    }).length;

    badEl.textContent = abaixo20;
  };

  const loadData = async () => {
    try {
      tableContainer.innerHTML = "<div class='loading'>Carregando produtos...</div>";
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Erro na rede");

      allProducts = await res.json();

      updateSummary(allProducts);
      renderTable(allProducts);
    } catch (err) {
      console.error(err);
      showToast("Erro ao carregar produtos", true);
      tableContainer.innerHTML = "<div class='loading'>Falha ao carregar</div>";
    }
  };

  // Busca
  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p =>
      String(p.codigo || "").toLowerCase().includes(term) ||
      String(p.produto || "").toLowerCase().includes(term)
    );
    renderTable(filtered);
  });

  // Exportar Excel
  document.getElementById("exportExcel").onclick = () => {
    const data = allProducts.map(p => {
      const custo = toNumber(p.custo);
      const venda = toNumber(p.venda);
      const margem = venda > 0 ? ((venda - custo) / venda) * 100 : 0;

      return {
        Código: p.codigo || '',
        Produto: p.produto || 'Sem nome',
        "Preço Custo": custo.toFixed(2),
        "Preço Venda": venda.toFixed(2),
        "Margem %": margem.toFixed(1)
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Margens");
    XLSX.writeFile(wb, `Relatorio_Margens_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("Excel exportado com sucesso!");
  };

  loadData();
});