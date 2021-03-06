<?php

namespace App\Integration\VersionOne\AssetMetadata\StoryStatus;

use App\Integration\VersionOne\AssetMetadata\AttributeInterface;

class OrderAttribute implements AttributeInterface
{
    public static function getName(): string
    {
        return 'Order';
    }

    public function isMultiValue(): bool
    {
        return false;
    }

    public function isRelation(): bool
    {
        return false;
    }

    public function getRelatedAsset(): ?string
    {
        return null;
    }
}
