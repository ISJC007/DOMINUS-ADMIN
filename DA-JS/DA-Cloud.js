// DA-JS/DA-Cloud.js
const firebaseConfig = {
    apiKey: "AIzaSyCeFdSmYQp1LWotNMmOXwcBB_LBFffwUyI",
    authDomain: "dominus-app-85008.firebaseapp.com",
    databaseURL: "https://dominus-app-85008-default-rtdb.firebaseio.com",
    projectId: "dominus-app-85008",
    storageBucket: "dominus-app-85008.firebasestorage.app",
    messagingSenderId: "489505850623",
    appId: "1:489505850623:web:8a9ae4d1bc04f066bdb8ca"
};

const DA_Cloud = {
    db: null,
    
    init() {
        // Inicializa Firebase si no se ha inicializado antes
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        this.db = firebase.database();
        console.log("🚀 DOMINUS ADMIN: Sistema de Nube vinculado.");
    }
};

// Arrancamos el motor
DA_Cloud.init();