package com.example.snapsaamp

import android.os.Parcel
import android.os.Parcelable

data class LotInfo(
    val nucli: String,
    val lotComplet: String,
    val usrre: String,
    val nomre: String,
    val datrec: String,
    val nbapel: Int
) : Parcelable {
    constructor(parcel: Parcel) : this(
        parcel.readString() ?: "",
        parcel.readString() ?: "",
        parcel.readString() ?: "",
        parcel.readString() ?: "",
        parcel.readString() ?: "",
        parcel.readInt()
    )

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeString(nucli)
        parcel.writeString(lotComplet)
        parcel.writeString(usrre)
        parcel.writeString(nomre)
        parcel.writeString(datrec)
        parcel.writeInt(nbapel)
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<LotInfo> {
        override fun createFromParcel(parcel: Parcel): LotInfo = LotInfo(parcel)
        override fun newArray(size: Int): Array<LotInfo?> = arrayOfNulls(size)
    }
}
