/* Datos iniciales tomados de para_inofrme.xlsx (hoja PCC) */
const DATOS_INICIALES = {
 "indicadores": [
  {
   "id": "mw6jaw7cdlpo",
   "nombre": "Compra general de café total de CPS y mojado",
   "anio": 2026,
   "unidad": "",
   "lo": 70,
   "hi": 90,
   "meses": [
    {
     "meta": "312631",
     "real": "151082.5"
    },
    {
     "meta": "150747",
     "real": "162148.5"
    },
    {
     "meta": "200000",
     "real": "194887"
    },
    {
     "meta": "627109",
     "real": "224359.5"
    },
    {
     "meta": "1373684",
     "real": "725786.5"
    },
    {
     "meta": "2080474",
     "real": "990490"
    },
    {
     "meta": "2164335",
     "real": "1454416"
    },
    {
     "meta": "1500000",
     "real": "1081477"
    },
    {
     "meta": "1500000",
     "real": "1195281.9"
    },
    {
     "meta": "1500000",
     "real": "962111.6"
    },
    {
     "meta": "1500000",
     "real": ""
    },
    {
     "meta": "1200000",
     "real": ""
    }
   ]
  },
  {
   "id": "mw6jaw7cr6kz",
   "nombre": "Café mojado",
   "anio": 2026,
   "unidad": "kg",
   "lo": 70,
   "hi": 90,
   "meses": [
    {
     "meta": "18000",
     "real": "12095"
    },
    {
     "meta": "24000",
     "real": "15313"
    },
    {
     "meta": "48000",
     "real": "54324"
    },
    {
     "meta": "312000",
     "real": "172887"
    },
    {
     "meta": "1419000",
     "real": "674407"
    },
    {
     "meta": "1680000",
     "real": "730498"
    },
    {
     "meta": "750000",
     "real": "639368"
    },
    {
     "meta": "261000",
     "real": "473993"
    },
    {
     "meta": "420000",
     "real": "381702"
    },
    {
     "meta": "780000",
     "real": "124316"
    },
    {
     "meta": "198000",
     "real": ""
    },
    {
     "meta": "90000",
     "real": ""
    }
   ]
  },
  {
   "id": "mw6jaw7ctzit",
   "nombre": "Compra de cacao",
   "anio": 2026,
   "unidad": "kg",
   "lo": 70,
   "hi": 90,
   "meses": [
    {
     "meta": "10000",
     "real": "2536"
    },
    {
     "meta": "10000",
     "real": "1646"
    },
    {
     "meta": "10000",
     "real": "2165"
    },
    {
     "meta": "10000",
     "real": "1830"
    },
    {
     "meta": "10000",
     "real": "2145"
    },
    {
     "meta": "10000",
     "real": "3122"
    },
    {
     "meta": "10000",
     "real": "4255"
    },
    {
     "meta": "10000",
     "real": "5668"
    },
    {
     "meta": "10000",
     "real": "8942.5"
    },
    {
     "meta": "10000",
     "real": "451"
    },
    {
     "meta": "10000",
     "real": ""
    },
    {
     "meta": "10000",
     "real": ""
    }
   ]
  },
  {
   "id": "mw6jaw7cj5oh",
   "nombre": "Compra de coproducto",
   "anio": 2026,
   "unidad": "kg",
   "lo": 70,
   "hi": 90,
   "meses": [
    {
     "meta": "8000",
     "real": "5111"
    },
    {
     "meta": "10000",
     "real": "10713"
    },
    {
     "meta": "8000",
     "real": "1924"
    },
    {
     "meta": "8000",
     "real": "2388"
    },
    {
     "meta": "9000",
     "real": "4460"
    },
    {
     "meta": "12000",
     "real": "7146"
    },
    {
     "meta": "13000",
     "real": "12556"
    },
    {
     "meta": "12000",
     "real": "29936"
    },
    {
     "meta": "10000",
     "real": "45990"
    },
    {
     "meta": "12000",
     "real": "3512"
    },
    {
     "meta": "13000",
     "real": ""
    },
    {
     "meta": "12000",
     "real": ""
    }
   ]
  },
  {
   "id": "mw6jaw7chzax",
   "nombre": "Café cereza – central beneficio húmedo",
   "anio": 2026,
   "unidad": "kg",
   "lo": 70,
   "hi": 90,
   "meses": [
    {
     "meta": "",
     "real": "0"
    },
    {
     "meta": "",
     "real": "0"
    },
    {
     "meta": "",
     "real": "0"
    },
    {
     "meta": "400000",
     "real": "53272"
    },
    {
     "meta": "665000",
     "real": "155659"
    },
    {
     "meta": "490000",
     "real": "253811"
    },
    {
     "meta": "770000",
     "real": "156863"
    },
    {
     "meta": "665000",
     "real": "122078"
    },
    {
     "meta": "770000",
     "real": "77771"
    },
    {
     "meta": "735000",
     "real": "63105"
    },
    {
     "meta": "665000",
     "real": ""
    },
    {
     "meta": "595000",
     "real": ""
    }
   ]
  },
  {
   "id": "mw6jaw7cyyh0",
   "nombre": "Trilla",
   "anio": 2026,
   "unidad": "sacos",
   "lo": 70,
   "hi": 90,
   "meses": [
    {
     "meta": "1745",
     "real": "2900.58"
    },
    {
     "meta": "5233.75",
     "real": "1189.45"
    },
    {
     "meta": "2881.25",
     "real": "779.35"
    },
    {
     "meta": "2663.75",
     "real": "1194.9"
    },
    {
     "meta": "6978.75",
     "real": "4806.66"
    },
    {
     "meta": "7981.25",
     "real": "4287.66"
    },
    {
     "meta": "11536.25",
     "real": "6162.51"
    },
    {
     "meta": "11822.5",
     "real": "5888.08"
    },
    {
     "meta": "12141.25",
     "real": "7673.17"
    },
    {
     "meta": "11320",
     "real": ""
    },
    {
     "meta": "6688.75",
     "real": ""
    },
    {
     "meta": "6507.5",
     "real": ""
    }
   ]
  },
  {
   "id": "mw6jaw7cndem",
   "nombre": "Exportaciones",
   "anio": 2026,
   "unidad": "sacos de 70 kg",
   "lo": 70,
   "hi": 90,
   "meses": [
    {
     "meta": "1396",
     "real": "1770"
    },
    {
     "meta": "4187",
     "real": "1422.23"
    },
    {
     "meta": "2305",
     "real": "1032.16"
    },
    {
     "meta": "2131",
     "real": "765.56"
    },
    {
     "meta": "5583",
     "real": "7207"
    },
    {
     "meta": "6385",
     "real": "2916"
    },
    {
     "meta": "9229",
     "real": "2770"
    },
    {
     "meta": "9458",
     "real": "4265"
    },
    {
     "meta": "9713",
     "real": "7966"
    },
    {
     "meta": "9056",
     "real": ""
    },
    {
     "meta": "5351",
     "real": ""
    },
    {
     "meta": "5206",
     "real": ""
    }
   ]
  },
  {
   "id": "mw6jaw7c5kt0",
   "nombre": "Café tostado",
   "anio": 2026,
   "unidad": "lb",
   "lo": 70,
   "hi": 90,
   "meses": [
    {
     "meta": "27917",
     "real": "26521.27"
    },
    {
     "meta": "31292",
     "real": "34368.46"
    },
    {
     "meta": "35584",
     "real": "31459.08"
    },
    {
     "meta": "42252",
     "real": "23568"
    },
    {
     "meta": "48361",
     "real": "36458.18"
    },
    {
     "meta": "50976",
     "real": "35110.04"
    },
    {
     "meta": "58270",
     "real": "41255.62"
    },
    {
     "meta": "43238",
     "real": "25274.41"
    },
    {
     "meta": "44827",
     "real": "35421.03"
    },
    {
     "meta": "55188",
     "real": ""
    },
    {
     "meta": "60765",
     "real": ""
    },
    {
     "meta": "70540",
     "real": ""
    }
   ]
  },
  {
   "id": "mw6jaw7cusif",
   "nombre": "Producción de mezclas de fertilizantes",
   "anio": 2026,
   "unidad": "sacos",
   "lo": 70,
   "hi": 90,
   "meses": [
    {
     "meta": "11800",
     "real": "0"
    },
    {
     "meta": "16840",
     "real": "0"
    },
    {
     "meta": "16840",
     "real": "2992"
    },
    {
     "meta": "16840",
     "real": "4045"
    },
    {
     "meta": "16840",
     "real": "1381"
    },
    {
     "meta": "16840",
     "real": "1191"
    },
    {
     "meta": "16840",
     "real": "900"
    },
    {
     "meta": "16840",
     "real": "0"
    },
    {
     "meta": "16840",
     "real": "5471"
    },
    {
     "meta": "16840",
     "real": ""
    },
    {
     "meta": "16840",
     "real": ""
    },
    {
     "meta": "16840",
     "real": ""
    }
   ]
  }
 ],
 "actual": "mw6jaw7cdlpo"
};
