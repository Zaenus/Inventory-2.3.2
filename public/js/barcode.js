document.addEventListener('DOMContentLoaded', () => {
  const reader = new Html5Qrcode("reader");

  function onScanSuccess(decodedText, decodedResult) {
    document.getElementById('result').innerText = `Scanned: ${decodedText}`;
    console.log(`Code scanned: ${decodedText}`, decodedResult);

    const selectedProduct = {
      type: "PRODUCT_SELECTED",
      codigo: decodedText,
      codigo_de_barras: decodedText  // optional, if you want to distinguish
    };

    // Send to parent window using postMessage (works even if opened as tab!)
    if (window.opener) {
      window.opener.postMessage(selectedProduct, window.location.origin);
    }

    // Also send to all possible parent contexts (covers edge cases)
    window.parent.postMessage(selectedProduct, window.location.origin);

    // Stop scanner and close
    reader.stop().then(() => {
      // Small delay so message is sent before closing
      setTimeout(() => window.close(), 100);
    }).catch(err => console.error("Failed to stop scanner", err));
  }

  reader.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      onScanSuccess
  ).catch(err => console.error("Failed to start scanning", err));
});

