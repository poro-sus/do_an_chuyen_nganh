<?php
require __DIR__.'/../backend/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(__DIR__.'/../backend')->load();
$pdo=new PDO('mysql:host='.$_ENV['DB_HOST'].';port='.$_ENV['DB_PORT'],$_ENV['DB_USERNAME'],$_ENV['DB_PASSWORD'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$pdo->exec('CREATE DATABASE IF NOT EXISTS `librivo_test` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
echo 'Dedicated librivo_test database is ready. Production/demo database untouched.'.PHP_EOL;
