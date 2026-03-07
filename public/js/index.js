document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalMessage = document.getElementById("modalMessage");
  const confirmBtn = document.getElementById("confirmBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const toast = document.getElementById("toast");

  const showToast = (msg, error = false) => {
    toast.textContent = msg;
    toast.className = "toast show" + (error ? " error" : "");
    setTimeout(() => toast.classList.remove("show"), 4000);
  };

  const openPage = (path) => window.open(path, "_blank");

  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      const action = card.dataset.action;
      if (action === "excluir") {
        modalTitle.textContent = "Excluir Contagem Completa";
        modalMessage.textContent = "Tem certeza? Esta ação não pode ser desfeita.";
        modal.style.display = "flex";

        const confirmHandler = async () => {
          try {
            const res = await fetch("/api/inventory/resetAll", { method: "DELETE" });
            if (res.ok) {
              showToast("Reset completo! Tudo limpo!");
            } else {
              showToast("Erro ao excluir contagem", true);
            }
          } catch (err) {
            showToast("Erro de conexão", true);
          }
          modal.style.display = "none";
        };

        confirmBtn.onclick = confirmHandler;
        cancelBtn.onclick = () => modal.style.display = "none";
      } else {
        const pages = {
          contagem: "/contagem",
          importar: "/importar",
          exportar: "/exportar",
          margens: "/relatorio-margens"
        };
        openPage(pages[action]);
      }
    });
  });

  // Atalhos de teclado
  document.addEventListener("keydown", (e) => {
    if (e.key === "F2") openPage("/contagem");
    if (e.key === "F8") openPage("/importar");
    if (e.key === "F9") openPage("/exportar");
    if (e.key === "F10") openPage("/relatorio-margens");
  });
});
