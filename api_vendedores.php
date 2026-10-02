<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Ruta al archivo de vendedores
$vendedoresFile = __DIR__ . '/vendedores.json';

if (file_exists($vendedoresFile)) {
    // Leer y enviar el archivo JSON
    echo file_get_contents($vendedoresFile);
} else {
    // Enviar error si no existe
    http_response_code(404);
    echo json_encode(['error' => 'Archivo de vendedores no encontrado']);
}
?>
