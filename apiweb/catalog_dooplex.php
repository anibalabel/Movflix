<?php
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
require_once __DIR__ . '/db_dooplex/Database.php';

$db = new DooplexDatabase();
$conn = $db->connect();

$type = $_GET['type'] ?? 'movies'; // 'movies' | 'series' | 'animes'
$page = max(1, (int)($_GET['page'] ?? 1));
$limit = min(50, max(1, (int)($_GET['limit'] ?? 24)));
$offset = ($page - 1) * $limit;
$search = trim($_GET['q'] ?? '');

$tableMap = [
    'movies' => ['table' => 'movies', 'title_col' => 'title'],
    'series' => ['table' => 'series', 'title_col' => 'name'],
    'animes' => ['table' => 'animes', 'title_col' => 'name'],
];

if (!isset($tableMap[$type])) {
    http_response_code(400);
    echo json_encode(['error' => 'Tipo inválido']);
    exit;
}

$table = $tableMap[$type]['table'];
$titleCol = $tableMap[$type]['title_col'];

$where = 'WHERE active = 1';
$params = [];
if ($search !== '') {
    $where .= " AND ({$titleCol} LIKE :search OR original_name LIKE :search OR tmdb_id = :exact_tmdb)";
    $params[':search'] = "%{$search}%";
    $params[':exact_tmdb'] = $search;
}

$stmt = $conn->prepare("SELECT * FROM {$table} {$where} ORDER BY id DESC LIMIT :limit OFFSET :offset");
foreach ($params as $k => $v) {
    $stmt->bindValue($k, $v);
}
$stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();

echo json_encode([
    'page' => $page,
    'limit' => $limit,
    'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
]);

