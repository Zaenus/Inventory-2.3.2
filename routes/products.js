// routes/products.js
const express = require('express');
const router = express.Router();

module.exports = (db) => {

  router.get('/searchProduct', (req, res) => {
    const code = req.query.code?.trim();
    if (!code) return res.status(400).json({});

    const query = `
      SELECT 
        codigo,
        produto,
        atual,
        codigo_de_barras,
        codigo_de_barras_sec,
        preco_custo AS custo,
        preco_venda AS venda,
        margem_lucro AS margem
      FROM products 
      WHERE codigo = ? 
         OR codigo_de_barras = ? 
         OR codigo_de_barras_sec = ?
      LIMIT 1
    `;

    db.get(query, [code, code, code], (err, row) => {
      if (err) {
        console.error('Erro ao buscar produto:', err);
        return res.status(500).json({});
      }
      if (!row) return res.json({});

      // Garantir que os valores numéricos venham como número
      res.json({
        codigo: row.codigo,
        produto: row.produto || 'Sem descrição',
        atual: Number(row.atual) || 0,
        codigo_de_barras: row.codigo_de_barras || '',
        codigo_de_barras_sec: row.codigo_de_barras_sec || '',
        custo: Number(row.custo) || 0,
        venda: Number(row.venda) || 0,
        margem: Number(row.margem) || 0  // já vem como decimal (ex: 0.456)
      });
    });
  });

  router.get('/products', (req, res) => {
    const query = `
      SELECT 
        codigo, produto, atual,
        codigo_de_barras, codigo_de_barras_sec,
        preco_custo AS custo,
        preco_venda AS venda,
        margem_lucro AS margem
      FROM products 
      ORDER BY produto
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Erro ao listar produtos:', err);
        return res.status(500).json([]);
      }

      const formatted = rows.map(row => ({
        codigo: row.codigo,
        produto: row.produto,
        atual: Number(row.atual) || 0,
        codigo_de_barras: row.codigo_de_barras || '',
        codigo_de_barras_sec: row.codigo_de_barras_sec || '',
        custo: Number(row.custo) || 0,
        venda: Number(row.venda) || 0,
        margem: Number(row.margem) || 0
      }));

      res.json(formatted);
    });
  });

  router.post('/produto', (req, res) => {
    const {
      codigo,
      produto,
      atual = 0,
      codigo_de_barras = "",
      codigo_de_barras_sec = "",
      preco_custo = 0,
      preco_venda = 0
    } = req.body;

    if (!codigo || !produto) {
      return res.status(400).json({ error: "Código e produto são obrigatórios" });
    }

    const custo = parseFloat(preco_custo) || 0;
    const venda = parseFloat(preco_venda) || 0;
    const margem = venda > 0 ? (venda - custo) / venda : 0;

    db.run(`
      INSERT INTO products 
        (codigo, produto, atual, codigo_de_barras, codigo_de_barras_sec, preco_custo, preco_venda, margem_lucro)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(codigo) DO UPDATE SET
        produto = excluded.produto,
        atual = excluded.atual,
        codigo_de_barras = excluded.codigo_de_barras,
        codigo_de_barras_sec = excluded.codigo_de_barras_sec,
        preco_custo = excluded.preco_custo,
        preco_venda = excluded.preco_venda,
        margem_lucro = excluded.margem_lucro
    `, [codigo, produto, atual, codigo_de_barras, codigo_de_barras_sec, custo, venda, margem], function(err) {
      if (err) {
        console.error("Erro ao salvar produto:", codigo, err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  });

  router.delete('/produto/:codigo', (req, res) => {
    const { codigo } = req.params;
    db.run('DELETE FROM products WHERE codigo = ?', [codigo], function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro ao excluir' });
      }
      res.json({ success: true, deleted: this.changes });
    });
  });

  return router;
};