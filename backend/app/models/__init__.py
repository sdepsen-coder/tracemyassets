from app.models.asset import Asset
from app.models.base import Base

class AssetManager(Base):
    def __init__(self, asset_list):
        # Initialize the AssetManager with a list of assets
        self.asset_list = asset_list

    def add_asset(self, new_asset):
        # Add a new asset to the asset list
        self.asset_list.append(new_asset)

    def remove_asset(self, asset_id):
        # Remove an asset from the asset list by its ID
        self.asset_list = [asset for asset in self.asset_list if asset.id != asset_id]

    def get_asset_by_id(self, asset_id):
        # Retrieve an asset by its ID
        for asset in self.asset_list:
            if asset.id == asset_id:
                return asset
        return None

    def list_assets(self):
        # List all assets
        return self.asset_list

    def update_asset(self, asset_id, updated_asset):
        # Update an existing asset with new information
        for index, asset in enumerate(self.asset_list):
            if asset.id == asset_id:
                self.asset_list[index] = updated_asset
                return True
        return False

    def asset_count(self):
        # Return the total number of assets
        return len(self.asset_list)