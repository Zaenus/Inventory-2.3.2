function importData() {
    fetch('http://localhost:3000/importData', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(/* your data here */),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.text();
      })
      .then(responseText => {
        console.log('Server Response:', responseText);
      })
      .catch(error => {
        console.error('Error communicating with the server:', error);
      });
  }  

function processData(importedData) {
    var connection = adodb.open('Provider=Microsoft.ACE.OLEDB.12.0;Data Source=C:/Users/Zaenus/Documents/Code/Coletor2.0/ProductDatabase.accdb;Persist Security Info=False;');
    var tableName = 'ProductTable';

    try {
        // Insert the imported data into the existing table
        for (var i = 0; i < importedData.length; i++) {
            var row = importedData[i];
            var { codigo, produto, atual, codigo_de_barras, codigo_de_barras_sec } = row;
            var insertQuery = `INSERT INTO ${tableName} (codigo, produto, atual, codigo_de_barras, codigo_de_barras_sec) VALUES ('${codigo}', '${produto}', ${atual}, '${codigo_de_barras}', '${codigo_de_barras_sec}')`;
            connection.execute(insertQuery);
        }

        console.log('Data inserted into the table.');
    } catch (err) {
        console.error('Error inserting data:', err);
    } finally {
        connection.close();
    }
}

