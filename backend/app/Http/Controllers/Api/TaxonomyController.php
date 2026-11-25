<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Author;
use App\Models\Category;
use App\Models\Publisher;
use App\Models\Shelf;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TaxonomyController extends Controller
{
    private function model(string $type): string
    {
        return match ($type) {
            'categories' => Category::class,'authors' => Author::class,'publishers' => Publisher::class,'shelves' => Shelf::class,default => abort(404)
        };
    }

    public function index(Request $r, string $type): JsonResponse
    {
        $model = $this->model($type);
        $q = $model::query()->withCount($type === 'shelves' ? 'copies' : 'books');
        if ($r->filled('search')) {
            $q->whereLike('name', '%'.$r->input('search').'%');
        }

return response()->json(['data' => $q->orderBy('name')->limit(500)->get()]);
    }

    private function validated(Request $r, string $type, ?int $id = null): array
    {
        $rules = ['name' => ['required', 'string', 'max:200', Rule::unique($type)->ignore($id)]];
        $rules += match ($type) {
            'categories' => ['parent_id' => 'nullable|exists:categories,id', 'description' => 'nullable|string|max:2000', 'color' => 'sometimes|regex:/^#[a-fA-F0-9]{6}$/'],'authors' => ['bio' => 'nullable|string|max:5000'],'publishers' => ['email' => 'nullable|email|max:255', 'phone' => 'nullable|string|max:30', 'address' => 'nullable|string|max:2000'],'shelves' => ['location' => 'nullable|string|max:255']
        };
        $d = $r->validate($rules);
        if ($type === 'categories') {
            $parent = $d['parent_id'] ?? null;
            $seen = [];
            while ($parent) {
                abort_if((int) $parent === $id || in_array($parent, $seen), 422, 'Danh mục không thể tạo vòng lặp cha/con.');
                $seen[] = $parent;
                $parent = Category::find($parent)?->parent_id;
            } $d['slug'] = Str::slug($d['name']).'-'.Str::lower(Str::random(4));
        }

return $d;
    }

    public function store(Request $r, string $type): JsonResponse
    {
        $model = $this->model($type);
        $d = $this->validated($r, $type);
        $item = $model::create($d);
        Audit::log($type.'.create', $item->id);

        return response()->json(['data' => $item], 201);
    }

    public function update(Request $r, string $type, int $id): JsonResponse
    {
        $model = $this->model($type);
        $item = $model::findOrFail($id);
        $item->update($this->validated($r, $type, $id));
        Audit::log($type.'.update', $id);

        return response()->json(['data' => $item]);
    }

    public function destroy(string $type, int $id): JsonResponse
    {
        $model = $this->model($type);
        DB::transaction(function () use ($model, $id, $type) {
            $item = $model::whereKey($id)->lockForUpdate()->firstOrFail();
            $relation = $type === 'shelves' ? 'copies' : 'books';
            abort_if($item->$relation()->exists() || ($type === 'categories' && $item->children()->exists()), 422, 'Dữ liệu đang được sử dụng, không thể xóa.');
            $item->delete();
            Audit::log($type.'.delete', $id);
        });

        return response()->json(['message' => 'Đã xóa.']);
    }
}
