<?php
/**
 * VS CRM catalog API — upload this next to db.php (usually adminPannel/).
 *
 * Example:
 *   https://vospaces.com/adminPannel/crm-listings-api.php
 *
 * Then paste that URL + the API key below into VS CRM → Settings.
 *
 * Change CRM_API_KEY before going live.
 */

define('CRM_API_KEY', 'vs-crm-catalog-change-me');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: X-API-Key, Authorization, Content-Type');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Use GET']);
    exit;
}

$provided = '';
if (!empty($_SERVER['HTTP_X_API_KEY'])) {
    $provided = $_SERVER['HTTP_X_API_KEY'];
} elseif (!empty($_GET['key'])) {
    $provided = $_GET['key'];
} elseif (!empty($_SERVER['HTTP_AUTHORIZATION']) && stripos($_SERVER['HTTP_AUTHORIZATION'], 'Bearer ') === 0) {
    $provided = trim(substr($_SERVER['HTTP_AUTHORIZATION'], 7));
}

if (!hash_equals(CRM_API_KEY, (string) $provided)) {
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid API key. Open this URL with ?key=vs-crm-catalog-change-me or send header X-API-Key.',
    ]);
    exit;
}

$dbFile = null;
foreach ([
    __DIR__ . '/db.php',
    __DIR__ . '/../db.php',
    __DIR__ . '/adminPannel/db.php',
    __DIR__ . '/../adminPannel/db.php',
] as $candidate) {
    if (is_file($candidate)) {
        $dbFile = $candidate;
        break;
    }
}

if (!$dbFile) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'db.php not found. Place this file in adminPannel/ next to db.php']);
    exit;
}

require $dbFile;

if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

function money($value) {
    if ($value === null || $value === '') {
        return null;
    }
    $n = (float) preg_replace('/[^0-9.]/', '', (string) $value);
    return $n > 0 ? $n : null;
}

function plan($id, $name, $value) {
    $price = money($value);
    if ($price === null) {
        return null;
    }
    return [
        'id' => $id,
        'name' => $name,
        'duration' => 'as listed',
        'price' => $price,
    ];
}

$includeInactive = isset($_GET['all']) && $_GET['all'] === '1';
$stateFilter = isset($_GET['state']) ? trim($_GET['state']) : '';
$cityFilter = isset($_GET['city']) ? trim($_GET['city']) : '';
$idFilter = isset($_GET['id']) ? (int) $_GET['id'] : 0;

$sql = "SELECT id, state, city, location, name, br, gst, ma, active, rank, map
        FROM listings";
$where = [];
$types = '';
$params = [];

if (!$includeInactive) {
    $where[] = 'active = 1';
}
if ($idFilter > 0) {
    $where[] = 'id = ?';
    $types .= 'i';
    $params[] = $idFilter;
}
if ($stateFilter !== '') {
    $where[] = 'state = ?';
    $types .= 's';
    $params[] = $stateFilter;
}
if ($cityFilter !== '') {
    $where[] = 'city = ?';
    $types .= 's';
    $params[] = $cityFilter;
}
if ($where) {
    $sql .= ' WHERE ' . implode(' AND ', $where);
}
$sql .= ' ORDER BY CASE WHEN rank = 0 THEN 1 ELSE 0 END, rank ASC, id ASC';

$stmt = $conn->prepare($sql);
if ($params) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

$listings = [];
$states = [];
$cities = [];

while ($row = $result->fetch_assoc()) {
    $plans = array_values(array_filter([
        plan('br', 'Business Registration', $row['br']),
        plan('gst', 'GST Registration', $row['gst']),
        plan('ma', 'Mailing Address', $row['ma']),
    ]));

    $stateName = trim((string) $row['state']);
    $cityName = trim((string) $row['city']);
    if ($stateName !== '') {
        $states[$stateName] = true;
    }
    if ($cityName !== '' && $stateName !== '') {
        $cities[$stateName . '|' . $cityName] = [
            'name' => $cityName,
            'state' => $stateName,
        ];
    }

    $listings[] = [
        'id' => (int) $row['id'],
        'name' => $row['name'] ?: $row['location'],
        'state' => $stateName,
        'city' => $cityName,
        'location' => $row['location'],
        'address' => trim($row['location'] . ', ' . $cityName . ', ' . $stateName, ' ,'),
        'active' => ((int) $row['active']) === 1,
        'rank' => (int) $row['rank'],
        'map' => $row['map'],
        'plans' => $plans,
    ];
}

$stmt->close();

echo json_encode([
    'status' => 'success',
    'source' => 'vospaces-listings',
    'states' => array_keys($states),
    'cities' => array_values($cities),
    'listings' => $listings,
], JSON_UNESCAPED_UNICODE);
