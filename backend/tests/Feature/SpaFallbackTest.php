<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Khi deploy, Laravel phục vụ bản build React (public/index.html).
 * Test tạo file tạm nếu chưa có bản build, rồi xoá đi để không làm bẩn thư mục public.
 */
class SpaFallbackTest extends TestCase
{
    private string $index;

    private bool $created = false;

    protected function setUp(): void
    {
        parent::setUp();
        $this->index = public_path('index.html');
        if (! is_file($this->index)) {
            file_put_contents($this->index, '<!doctype html><title>spa-test</title>');
            $this->created = true;
        }
    }

    protected function tearDown(): void
    {
        if ($this->created && is_file($this->index)) {
            unlink($this->index);
        }
        parent::tearDown();
    }

    public function test_client_route_returns_the_spa_shell(): void
    {
        $this->get('/catalog')->assertOk()->assertHeader('Content-Type', 'text/html; charset=utf-8');
        $this->get('/')->assertOk()->assertHeader('Content-Type', 'text/html; charset=utf-8');
    }

    public function test_unknown_api_path_stays_a_json_404(): void
    {
        $this->getJson('/api/khong-co-endpoint-nay')->assertNotFound();
        $this->get('/api/khong-co-endpoint-nay')->assertNotFound();
    }

    public function test_missing_static_files_are_not_replaced_by_html(): void
    {
        $this->get('/assets/khong-co.js')->assertNotFound();
        $this->get('/covers/khong-co.jpg')->assertNotFound();
        // /storage/{path} do đĩa "local" (serve=true) của Laravel đăng ký nên có thể trả 403 thay vì 404;
        // quan trọng là không bao giờ trả 200 + HTML của React.
        $this->assertContains($this->get('/storage/khong-co.png')->getStatusCode(), [403, 404]);
    }
}
