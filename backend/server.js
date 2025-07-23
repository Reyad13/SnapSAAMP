const express = require('express');
const odbc = require('odbc');
const app = express();
app.use(express.json());

// Configuration de la connexion ODBC (modifiez DSN, UID et PWD selon votre configuration)
const connectionString = 'DSN=AS400;UID=BOUREY;PWD=BOUREY';

// Requête SQL pour récupérer les infos du lot
const queryLotInfo = `
  SELECT l.nucli, l.lot1, r.usrre, r.nomre, l.datrec, l.nbapel
  FROM gescomf.lotp1 l
  JOIN specif1.lotp1re1 r ON r.ste = l.ste AND r.lot1 = l.lot1
  WHERE surno2 NOT IN ('A1','X1','R1')
    AND (l.LOT1 = ? OR l.LOT1 = ?)
`;

app.post('/api/lotinfo', async (req, res) => {
  const { lotCode } = req.body;
  if (!lotCode) return res.status(400).json({ error: 'lotCode missing' });
  try {
    const connection = await odbc.connect(connectionString);
    const params = [lotCode, '0' + lotCode];
    const result = await connection.query(queryLotInfo, params);
    await connection.close();
    if (result.length === 0) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    const row = result[0];
    const lotInfo = {
      nucli: row.NUCLI.toString().trim(),
      lot_complet: row.LOT1.toString().trim(),
      usrre: row.USRRE.toString().trim(),
      nomre: row.NOMRE.toString().trim(),
      datrec: row.DATREC.toString().trim(),
      nbapel: row.NBAPEL ? parseInt(row.NBAPEL) : 0
    };
    res.json(lotInfo);
  } catch (err) {
    console.error('ODBC error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/update-nbapel', async (req, res) => {
  const { lot_complet } = req.body;
  if (!lot_complet) return res.status(400).json({ error: 'lot_complet missing' });
  try {
    const connection = await odbc.connect(connectionString);
    const updateQuery = `UPDATE GESCOMF.LOTP1 SET NBAPEL = 1 WHERE LOT1 = ?`;
    await connection.query(updateQuery, [lot_complet]);
    await connection.close();
    res.json({ message: 'NBAPEL updated' });
  } catch (err) {
    console.error('ODBC error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
