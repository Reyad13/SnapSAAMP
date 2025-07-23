package com.example.snapsaamp

import android.content.Intent
import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AppCompatActivity

class HomeActivity : AppCompatActivity() {

    private lateinit var lotCodeEditText: EditText
    private lateinit var fondeurEditText: EditText
    private lateinit var modeRadioGroup: RadioGroup
    private lateinit var validateButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)

        lotCodeEditText = findViewById(R.id.lotCodeEditText)
        fondeurEditText = findViewById(R.id.fondeurEditText)
        modeRadioGroup = findViewById(R.id.modeRadioGroup)
        validateButton = findViewById(R.id.validateButton)

        modeRadioGroup.setOnCheckedChangeListener { _, checkedId ->
            fondeurEditText.visibility = if (checkedId == R.id.radioAvantFonte) {
                EditText.VISIBLE
            } else {
                EditText.GONE
            }
        }

        validateButton.setOnClickListener {
            val lotCode = lotCodeEditText.text.toString().trim()
            if (lotCode.isEmpty()) {
                Toast.makeText(this, "Veuillez saisir un code de lot", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val mode = when (modeRadioGroup.checkedRadioButtonId) {
                R.id.radioReception -> "reception"
                R.id.radioAvantFonte -> "avant_fonte"
                else -> "reception"
            }
            val fondeurName = fondeurEditText.text.toString().trim()
            if (mode == "avant_fonte" && fondeurName.isEmpty()) {
                Toast.makeText(this, "Veuillez saisir le nom du fondeur", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            // Pour le test, on simule la récupération d'un lot
            val lotInfo = if (lotCode == "488955") {
                LotInfo("123", lotCode, "User R", "Nom R", "01012023", 0)
            } else {
                null
            }
            if (lotInfo == null) {
                Toast.makeText(this, "Lot non trouvé", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val requireSignature = if (mode == "reception") (lotInfo.nbapel == 0) else false

            val intent = Intent(this, CameraActivity::class.java)
            intent.putExtra("mode", mode)
            intent.putExtra("fondeurName", fondeurName)
            intent.putExtra("lotInfo", lotInfo)
            intent.putExtra("requireSignature", requireSignature)
            startActivity(intent)
        }
    }
}
