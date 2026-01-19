// Module-level variables and functions
const modal = document.querySelector("#modal");
const modalTitle = document.querySelector("#modal-title");
const modalMessage = document.querySelector("#modal-message");
const modalConfirm = document.querySelector("#modal-confirm");
const modalCancel = document.querySelector("#modal-cancel");
const modalOk = document.querySelector("#modal-ok");

function showModal(title, message, showConfirmCancel = true) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalConfirm.style.display = showConfirmCancel ? "inline-block" : "none";
    modalCancel.style.display = showConfirmCancel ? "inline-block" : "none";
    modalOk.style.display = showConfirmCancel ? "none" : "inline-block";
    modal.style.display = "flex";
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    if (showConfirmCancel) {
        modalConfirm.focus();
    } else {
        modalOk.focus();
    }
}

function hideModal() {
    modal.classList.remove("active");
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
}

// Event listeners for modal buttons (set up after DOM is loaded)
document.addEventListener("DOMContentLoaded", () => {
    const importPlan = document.querySelector(".importar-contagem");
    const inicCont = document.querySelector(".contagem-iniciar");
    const inventory = document.querySelector(".exportar-inventario");
    const deleteButton = document.querySelector(".excluir-contagem");

    modalCancel.addEventListener("click", hideModal);
    modalOk.addEventListener("click", hideModal);

    // Delete all data with modal
    async function deleteAllData() {
        showModal(
            "Confirmar Exclusão",
            "Tem certeza que deseja excluir todos os dados? Esta ação não pode be desfeita.",
            true
        );

        return new Promise((resolve) => {
            modalConfirm.addEventListener(
                "click",
                async () => {
                    hideModal();
                    try {
                        const response = await fetch("/api/deleteAllData", {
                            method: "DELETE",
                        });
                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }
                        const result = await response.json();
                        if (result.success) {
                            console.log("All data deleted successfully");
                            showModal("Sucesso", "Todos os dados foram excluídos com sucesso!", false);
                            resolve(true);
                        } else {
                            console.error("Error deleting all data:", result.message);
                            showModal("Erro", "Erro ao excluir dados. Tente novamente.", false);
                            resolve(false);
                        }
                    } catch (error) {
                        console.error("Error deleting all data:", error);
                        showModal("Erro", "Erro ao excluir dados. Tente novamente.", false);
                        resolve(false);
                    }
                },
                { once: true }
            );

            modalCancel.addEventListener(
                "click",
                () => {
                    console.log("Deletion canceled by user.");
                    resolve(false);
                },
                { once: true }
            );
        });
    }

    // Event listeners for buttons
    inicCont.addEventListener("click", iniCont);
    importPlan.addEventListener("click", openWindow);
    inventory.addEventListener("click", openInvent);
    deleteButton.addEventListener("click", deleteAllData);

    // Accessibility keypress for Enter/Space
    [inicCont, importPlan, inventory, deleteButton].forEach((element) => {
        element.addEventListener("keypress", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.target.click();
            }
        });
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (event) => {
        switch (event.key) {
            case "F2":
                iniCont();
                break;
            case "F8":
                openWindow();
                break;
            case "F9":
                openInvent();
                break;
            case "Escape": // Close modal with Escape key
                hideModal();
                break;
        }
    });

    function openWindow() {
        console.log("Opening window");
        window.open("/importar", "_blank");
    }

    function iniCont() {
        window.open("/contagem", "_blank");
    }

    function openInvent() {
        window.open("/exportar", "_blank");
    }

    // Initial keydown listeners (outside of DOMContentLoaded for consistency)
    document.addEventListener("keydown", (event) => {
        if (event.key === "F8") {
            openWindow();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "F2") {
            iniCont();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "F9") {
            openInvent();
        }
    });

    // Initial click listeners (outside of DOMContentLoaded for consistency)
    inicCont.addEventListener("click", iniCont);
    importPlan.addEventListener("click", openWindow);
    inventory.addEventListener("click", openInvent);
});

// Export the modal functions
export { showModal, hideModal };document.addEventListener("DOMContentLoaded", () => {
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
        modalTitle.textContent = "Excluir Contagem do Dia";
        modalMessage.textContent = "Tem certeza? Esta ação não pode ser desfeita.";
        modal.style.display = "flex";

        const confirmHandler = async () => {
          try {
            const res = await fetch("/api/inventory/resetDay", { method: "DELETE" });
            if (res.ok) {
              showToast("Reset completo! Tudo limpo para amanhã!");
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