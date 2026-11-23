<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'name' => $this->name, 'email' => $this->email, 'phone' => $this->phone, 'avatar' => $this->avatar, 'member_code' => $this->member_code, 'locked' => $this->locked, 'created_at' => $this->created_at, 'roles' => $this->getRoleNames(), 'permissions' => $this->getAllPermissions()->pluck('name'), 'loans_count' => $this->whenCounted('loans'), 'active_count' => $this->whenHas('active_count'), 'overdue_count' => $this->whenHas('overdue_count')];
    }
}
