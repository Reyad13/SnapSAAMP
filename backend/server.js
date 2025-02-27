const express = require('express');
const odbc = require('odbc');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const app = express();

app.use(express.json());

// Route de test pour vérifier que le serveur répond
app.get('/', (req, res) => {
  res.send('Hello, world! Server is up.');
});

// Configuration de multer pour stocker le fichier en mémoire
const upload = multer({ storage: multer.memoryStorage() });

// ========================
// ENDPOINTS EXISTANTS
// ========================

// Récupération des infos du lot
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
    const connection = await odbc.connect('DSN=AS400;UID=BOUREY;PWD=BOUREY');
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

// Mise à jour de NBAPEL
app.post('/api/update-nbapel', async (req, res) => {
  const { lot_complet } = req.body;
  if (!lot_complet) return res.status(400).json({ error: 'lot_complet missing' });
  try {
    const connection = await odbc.connect('DSN=AS400;UID=BOUREY;PWD=BOUREY');
    const updateQuery = `UPDATE GESCOMF.LOTP1 SET NBAPEL = 1 WHERE LOT1 = ?`;
    await connection.query(updateQuery, [lot_complet]);
    await connection.close();
    res.json({ message: 'NBAPEL updated' });
  } catch (err) {
    console.error('ODBC error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// ENDPOINT D'UPLOAD VERS LA GED
// ========================

/**
 * Récupère le token d'authentification auprès de l'API Maileva
 */
const getAuthToken = async () => {
  const authUrl = "https://ged.maileva.com/api/usr/auth";
  const authData = {
    login: "reyad.bouzeboudja@saamp.com",
    password: "KNa2Q5e1"
  };
  const response = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(authData)
  });
  const data = await response.json();
  if (data.data && data.data.authToken) {
    return data.data.authToken;
  } else {
    throw new Error("Authentication failed, token not received");
  }
};

/**
 * Récupère les informations d'un dossier par son nom
 */
const getFolderByName = async (folderName, authToken) => {
  const url = `https://ged.maileva.com/api/folder/name/${encodeURIComponent(folderName)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Auth-Token": authToken,
      "Content-Type": "application/json"
    }
  });
  const data = await response.json();
  return data;
};

/**
 * Vérifie si un dossier existe sous un parent donné ; sinon, le crée.
 */
const getOrCreateFolder = async (parentId, folderName, authToken) => {
  const urlFind = `https://ged.maileva.com/api/folder/find?parentId=${parentId}&name=${encodeURIComponent(folderName)}`;
  let response = await fetch(urlFind, {
    method: "GET",
    headers: {
      "Auth-Token": authToken,
      "Content-Type": "application/json"
    }
  });
  
  if (response.status === 404) {
    console.log(`[DEBUG] Dossier "${folderName}" non trouvé (404).`);
  } else if (!response.ok) {
    throw new Error(`Erreur lors de la recherche du dossier "${folderName}". Statut: ${response.status}`);
  } else {
    try {
      const data = await response.json();
      if (data.success === true) {
        console.log(`[DEBUG] Le dossier '${folderName}' (parent ${parentId}) existe déjà : ID=${data.data.id}`);
        return data.data.id;
      }
    } catch (err) {
      console.error("Erreur lors du parsing JSON :", err);
    }
  }
  
  // Si le dossier n'existe pas, on le crée
  console.log(`[DEBUG] Création du dossier '${folderName}' sous le parent ${parentId}...`);
  const urlCreate = "https://ged.maileva.com/api/folder/";
  const postData = { name: folderName, parentId: parentId };
  response = await fetch(urlCreate, {
    method: "POST",
    headers: {
      "Auth-Token": authToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(postData)
  });
  let rawCreate = await response.text();
  console.log("Réponse brute (POST) :", rawCreate);
  let dataCreate;
  try {
    dataCreate = JSON.parse(rawCreate);
  } catch (err) {
    throw new Error("Réponse non JSON lors de la création du dossier.");
  }
  if (dataCreate.success === true) {
    console.log(`[DEBUG] Dossier '${folderName}' créé avec ID=${dataCreate.data.id}`);
    return dataCreate.data.id;
  } else {
    throw new Error(`Impossible de créer le dossier "${folderName}". Réponse: ${rawCreate}`);
  }
};

/**
 * Upload un fichier vers l'API GED dans le dossier spécifié via axios.
 */
const uploadFileToGed = async (fileBuffer, originalName, fileType, authToken, pathString) => {
  try {
    const formData = new FormData();
    formData.append("file", fileBuffer, {
      filename: originalName,
      contentType: fileType,
    });
    formData.append("path", pathString);
    
    // Récupérer les headers générés par formData et ajouter Auth-Token
    const headers = {
      ...formData.getHeaders(),
      "Auth-Token": authToken,
    };

    const url = "https://ged.maileva.com/api/document";

    console.log("Axios headers:", headers);
    console.log("Chemin envoyé:", pathString);

    // Envoi de la requête POST via axios
    const response = await axios.post(url, formData, { headers });
    console.log("Axios response data:", response.data);
    return response.data;
  } catch (error) {
    console.error("Axios upload error:", error.response ? error.response.data : error.message);
    throw error;
  }
};

app.post('/upload-to-ged', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File missing' });
    }
    const originalName = req.file.originalname;
    const parts = originalName.split('_');
    if (parts.length < 2) {
      return res.status(400).json({ error: 'Invalid file name, cannot extract client id' });
    }
    const clientId = parts[0];
    
    const authToken = await getAuthToken();
    
    const mainFolderName = "DOCUMENTS OUVERTURE DE COMPTE";
    const folderByNameData = await getFolderByName(mainFolderName, authToken);
    if (!(folderByNameData.success && folderByNameData.data && folderByNameData.data.id)) {
      return res.status(500).json({ error: `Main folder "${mainFolderName}" not found` });
    }
    const mainFolderId = folderByNameData.data.id;
    
    const clientFolderId = await getOrCreateFolder(mainFolderId, clientId, authToken);
    const photosFolderId = await getOrCreateFolder(clientFolderId, "PHOTOS_FONTES", authToken);
    
    const pathString = `${mainFolderName}/${clientId}/PHOTOS_FONTES`;
    
    const uploadResult = await uploadFileToGed(
      req.file.buffer,
      originalName,
      req.file.mimetype,
      authToken,
      pathString
    );
    if (uploadResult.success) {
      res.json({ message: 'Upload successful', details: uploadResult });
    } else {
      res.status(500).json({ error: 'Upload failed', details: uploadResult });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error', details: err.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server listening on port ${PORT}`));
