// routes/inventory.js
const express = require('express');
const router = express.Router();

module.exports = (db) => {

  router.post('/registerInventory', (req, res) => {
    const { codigo, codigo_de_barras, produto, quantidade_contada } = req.body;

    if (!codigo || quantidade_contada === undefined || !produto) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const qtd = parseFloat(quantidade_contada);
    if (isNaN(qtd) || qtd < 0) {
      return res.status(400).json({ error: 'Quantidade inválida' });
    }

    const query = `
      INSERT INTO inventory_compaction 
        (codigo, codigo_de_barras, produto, quantidade_contada, data_hora)
      VALUES (?, ?, ?, ?, datetime('now'))
    `;

    db.run(query, [codigo, codigo_de_barras || null, produto, qtd], function (err) {
      if (err) {
        console.error('Erro ao registrar contagem:', err);
        return res.status(500).json({ error: 'Erro ao salvar' });
      }
      res.json({ success: true, id: this.lastID });
    });
  });

  router.get('/inventoryCompaction', (req, res) => {
    const query = `
      SELECT 
        i.codigo,
        i.codigo_de_barras,
        i.produto,
        i.quantidade_contada,
        i.data_hora,
        p.codigo,
        p.preco_custo,
        p.preco_venda,
        p.margem_lucro
      FROM inventory_compaction i
      LEFT JOIN products p ON i.codigo = p.codigo
      ORDER BY i.data_hora DESC
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Erro ao carregar inventário:', err);
        return res.status(500).json([]);
      }
      res.json(rows);
    });
  });

router.get('/inventoryExport', (req, res) => {
  const query = `
    SELECT
      p.codigo,
      p.codigo_de_barras,
      p.produto,
      COALESCE(SUM(i.quantidade_contada), 0) AS quantidade_contada,
      MIN(i.data_hora) AS data_hora,
      p.atual
    FROM products p
    LEFT JOIN inventory_compaction i
      ON i.codigo = p.codigo
    WHERE
      p.atual > 0
      OR i.codigo IS NOT NULL
    GROUP BY
      p.codigo,
      p.codigo_de_barras,
      p.produto,
      p.atual
    ORDER BY
      p.produto ASC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erro ao carregar inventário:', err);
      return res.status(500).json([]);
    }
    res.json(rows);
  });
});

  router.get('/totalQuantityCounted/:codigo', (req, res) => {
    const { codigo } = req.params;

    const query = `
      SELECT COALESCE(SUM(quantidade_contada), 0) as totalQuantityCounted
      FROM inventory_compaction 
      WHERE codigo = ?
    `;

    db.get(query, [codigo], (err, row) => {
      if (err) {
        console.error('Erro ao somar contagem:', err);
        return res.status(500).json({ totalQuantityCounted: 0 });
      }
      res.json({ totalQuantityCounted: Number(row.totalQuantityCounted) || 0 });
    });
  });

  router.delete('/removeInventoryItem/:codigo/:data_hora', (req, res) => {
    const { codigo, data_hora } = req.params;

    const query = `
      DELETE FROM inventory_compaction 
      WHERE codigo = ? AND data_hora = ?
    `;

    db.run(query, [codigo, data_hora], function (err) {
      if (err) {
        console.error('Erro ao remover item:', err);
        return res.status(500).json({ error: 'Falha ao remover' });
      }
      res.json({ success: true, deleted: this.changes });
    });
  });

  router.put('/updateInventoryQuantity', (req, res) => {
    const { codigo, quantidade_contada, data_hora } = req.body;

    if (!codigo || !data_hora || quantidade_contada === undefined) {
      return res.status(400).json({ error: 'Dados faltando' });
    }

    const qtd = parseFloat(quantidade_contada);
    if (isNaN(qtd) || qtd < 0) {
      return res.status(400).json({ error: 'Quantidade inválida' });
    }

    const query = `
      UPDATE inventory_compaction 
      SET quantidade_contada = ? 
      WHERE codigo = ? AND data_hora = ?
    `;

    db.run(query, [qtd, codigo, data_hora], function (err) {
      if (err) {
        console.error('Erro ao atualizar quantidade:', err);
        return res.status(500).json({ error: 'Falha ao atualizar' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Item não encontrado' });
      }
      res.json({ success: true });
    });
  });

  router.delete('/clearTodayInventory', (req, res) => {
    const query = `DELETE FROM inventory_compaction WHERE date(data_hora) = date('now')`;

    db.run(query, function (err) {
      if (err) {
        console.error('Erro ao limpar inventário do dia:', err);
        return res.status(500).json({ error: 'Falha ao limpar' });
      }
      res.json({ success: true, deleted: this.changes });
    });
  });

  router.get('/report', (req, res) => {
    const query = `
      SELECT 
        i.codigo,
        i.produto,
        p.preco_venda,
        SUM(i.quantidade_contada) as contada,
        p.atual as sistema,
        (SUM(i.quantidade_contada) - p.atual) as diferenca,
        (SUM(i.quantidade_contada) * p.preco_venda) as valor_contado
      FROM inventory_compaction i
      LEFT JOIN products p ON i.codigo = p.codigo
      GROUP BY i.codigo
      ORDER BY diferenca DESC
    `;

    db.all(query, [], (err, rows) => {
      if (err) return res.status(500).json([]);
      
      const totais = rows.reduce((acc, r) => ({
        valor_total: acc.valor_total + (r.valor_contado || 0),
        diferenca_total: acc.diferenca_total + (r.diferenca || 0)
      }), { valor_total: 0, diferenca_total: 0 });

      res.json({ itens: rows, totais });
    });
  });

  router.get('/inventory/exportToday', (req, res) => {
    const query = `
        SELECT 
          p.codigo,
          p.produto,
          p.atual AS sistema,
          p.codigo_de_barras,
          COALESCE(SUM(i.quantidade_contada), 0) AS contada,
          (COALESCE(SUM(i.quantidade_contada), 0) - p.atual) AS diferenca
        FROM products p
        LEFT JOIN inventory_compaction i 
          ON p.codigo = i.codigo 
        WHERE p.atual > 0 
          OR EXISTS (
            SELECT 1 FROM inventory_compaction i2 
            WHERE i2.codigo = p.codigo 
          )
        GROUP BY p.codigo, p.produto, p.atual
        ORDER BY ABS(diferenca) DESC, p.produto ASC
      `;

      db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Erro no /exportToday:', err);
          return res.status(500).json({ error: 'Erro no servidor' });
        }
        res.json(rows);
      });
  });

  router.delete('/inventory/resetDay', (req, res) => {
    // Usando transação pra garantir que ou apaga tudo, ou nada
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // 1. Apaga toda a contagem de hoje
      db.run(`DELETE FROM inventory_compaction WHERE date(data_hora) = date('now')`, function(err) {
        if (err) {
          console.error("Erro ao limpar inventory_compaction:", err);
          db.run("ROLLBACK");
          return res.status(500).json({ success: false, error: "Falha ao limpar contagem" });
        }
        console.log(`Contagem do dia apagada: ${this.changes} itens`);
      });

      // 2. Apaga TODOS os produtos (vai importar novos amanhã)
      db.run(`DELETE FROM products`, function(err) {
        if (err) {
          console.error("Erro ao limpar products:", err);
          db.run("ROLLBACK");
          return res.status(500).json({ success: false, error: "Falha ao limpar produtos" });
        }
        console.log(`Tabela products limpa: ${this.changes} produtos removidos`);

        // Tudo deu certo → commit
        db.run("COMMIT");
        res.json({ 
          success: true, 
          message: "Reset completo! Contagem e produtos apagados.",
          deletedInventory: this.changes,
          deletedProducts: this.changes  // último this.changes = products
        });
      });
    });
  });

  return router;
};