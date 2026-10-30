<?php
declare(strict_types=1);

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (!isset($pdo, $user) || !$pdo instanceof PDO || !is_array($user)) {
    throw new RuntimeException('login_success.php requires the authenticated $user and PDO $pdo variables.');
}

if (!isset($user['id'], $user['is_paid'])) {
    throw new RuntimeException('The authenticated user must include id and is_paid.');
}

if (empty($user['is_paid'])) {
    $trialEndsAt = $user['trial_ends_at'] ?? null;
    if ($trialEndsAt === null || new DateTimeImmutable($trialEndsAt) < new DateTimeImmutable()) {
        header('Location: locked.php', true, 303);
        exit;
    }
}
