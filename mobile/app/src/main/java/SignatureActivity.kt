package com.example.snapsaamp

import android.content.Intent
import android.graphics.Bitmap
import android.os.Bundle
import android.util.Base64
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.snapsaamp.databinding.ActivitySignatureBinding
import java.io.ByteArrayOutputStream

class SignatureActivity : AppCompatActivity() {
    private lateinit var binding: ActivitySignatureBinding
    private lateinit var mode: String
    private lateinit var fondeurName: String
    private lateinit var lotInfo: LotInfo
    private lateinit var photoUri: String

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySignatureBinding.inflate(layoutInflater)
        setContentView(binding.root)

        mode = intent.getStringExtra("mode") ?: "reception"
        fondeurName = intent.getStringExtra("fondeurName") ?: ""
        photoUri = intent.getStringExtra("photoUri") ?: ""
        lotInfo = intent.getParcelableExtra("lotInfo")!!

        binding.validateButton.setOnClickListener {
            val signatureBitmap = binding.signatureView.getBitmap()
            if (signatureBitmap == null) {
                Toast.makeText(this, "Veuillez signer", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val signatureBase64 = bitmapToBase64(signatureBitmap)
            val intent = Intent(this, FinalActivity::class.java)
            intent.putExtra("photoUri", photoUri)
            intent.putExtra("signatureData", signatureBase64)
            intent.putExtra("mode", mode)
            intent.putExtra("fondeurName", fondeurName)
            intent.putExtra("lotInfo", lotInfo)
            startActivity(intent)
        }
    }

    private fun bitmapToBase64(bitmap: Bitmap): String {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
        val byteArray = outputStream.toByteArray()
        return Base64.encodeToString(byteArray, Base64.DEFAULT)
    }
}
