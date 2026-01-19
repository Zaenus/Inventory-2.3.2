async function sendDataToServer(items) {
    
    fetch(`/api/saveData`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(items),
    })
    .then(response => response.text())
    .then(data => console.log('Data received from server:', data))
    .catch(error => console.error('Error sending data to server:', error));
}

document.addEventListener('DOMContentLoaded', function () {
    console.log('Display Data script loaded');

    // Retrieve imported data from local storage
    const importedData = JSON.parse(localStorage.getItem('extractedData')) || [];

    // Display imported data in the table
    const dataTableBody = document.getElementById('dataTable').getElementsByTagName('tbody')[0];

    // Accumulate items
    const allItems = [];

    importedData.forEach((item, index) => {
        const row = document.createElement('tr');

        const idCell = document.createElement('td');
        idCell.textContent = index + 1;
        row.appendChild(idCell);

        const codeCell = document.createElement('td');
        codeCell.textContent = item.codigo || '';
        row.appendChild(codeCell);

        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = item.produto || '';
        row.appendChild(descriptionCell);

        const barcodeCell = document.createElement('td');
        barcodeCell.textContent = item.codigo_de_barras || '';
        row.appendChild(barcodeCell);

        const secondaryBarcodeCell = document.createElement('td');
        secondaryBarcodeCell.textContent = item.codigo_de_barras_sec || '';
        row.appendChild(secondaryBarcodeCell);

        const quantityCell = document.createElement('td');
        quantityCell.textContent = item.atual || '';
        row.appendChild(quantityCell);

        dataTableBody.appendChild(row);

        // Add the item to the list
        allItems.push(item);
    });

    // Send all items to the server
    sendDataToServer(allItems);

    // Prevent the form from reloading the page
    document.getElementById('dataTable').addEventListener('submit', function (event) {
        event.preventDefault();
    });
});