package com.example.snapsaamp

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Typeface
import android.os.Bundle
import android.util.Base64
import androidx.appcompat.app.AppCompatActivity
import com.example.snapsaamp.databinding.ActivityFinalBinding
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

class FinalActivity : AppCompatActivity() {

    private lateinit var binding: ActivityFinalBinding
    private lateinit var photoUri: String
    private lateinit var signatureData: String
    private lateinit var mode: String
    private lateinit var fondeurName: String
    private lateinit var lotInfo: LotInfo

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityFinalBinding.inflate(layoutInflater)
        setContentView(binding.root)

        photoUri = intent.getStringExtra("photoUri") ?: ""
        signatureData = intent.getStringExtra("signatureData") ?: ""
        mode = intent.getStringExtra("mode") ?: "reception"
        fondeurName = intent.getStringExtra("fondeurName") ?: ""
        lotInfo = intent.getParcelableExtra("lotInfo")!!

        val finalBitmap = mergePhotoWithOverlay()
        binding.finalImageView.setImageBitmap(finalBitmap)

        binding.returnButton.setOnClickListener {
            finishAffinity()
        }
    }

    private fun mergePhotoWithOverlay(): Bitmap? {
        val photoFile = File(photoUri)
        val photoBitmap = BitmapFactory.decodeFile(photoFile.absolutePath) ?: return null
        val mutableBitmap = photoBitmap.copy(Bitmap.Config.ARGB_8888, true)
        val canvas = Canvas(mutableBitmap)
        val paint = Paint().apply {
            color = android.graphics.Color.BLACK
            textSize = 48f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        }
        val nowStr = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault()).format(Date())
        val overlayText = "client: ${lotInfo.nucli}\nlot: ${lotInfo.lotComplet}\n${lotInfo.usrre}\nremis par: ${lotInfo.nomre}\ndate: $nowStr" +
                if (mode == "avant_fonte" && fondeurName.isNotEmpty()) "\nFondeur: $fondeurName" else ""
        canvas.drawText(overlayText, 50f, 50f, paint)

        if (signatureData.isNotEmpty()) {
            val signatureBitmap = decodeBase64ToBitmap(signatureData)
            signatureBitmap?.let {
                canvas.drawBitmap(it, 50f, mutableBitmap.height - it.height - 50f, null)
            }
        }
        return mutableBitmap
    }

    private fun decodeBase64ToBitmap(base64Str: String): Bitmap? {
        return try {
            val decodedBytes = Base64.decode(base64Str, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
        } catch (e: Exception) {
            null
        }
    }
}
