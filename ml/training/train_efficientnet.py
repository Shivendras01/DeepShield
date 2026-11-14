"""
DeepShield Google Colab Training Pipeline.

Two-stage Transfer Learning Fine-Tuning for EfficientNet-B0 on FaceForensics++ / Celeb-DF.
Stage 1: Frozen backbone, trains classification head (LR: 1e-3).
Stage 2: End-to-end full network fine-tuning at reduced learning rate (LR: 2e-5).
"""

import os
import argparse
import time
from typing import Tuple
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms
from PIL import Image


class FaceCropDataset(Dataset):
    """
    Standard PyTorch Dataset for binary authentic/manipulated face crop directories:
      dataset_dir/
        train/
          real/
          fake/
        val/
          real/
          fake/
    """
    def __init__(self, root_dir: str, transform=None):
        self.image_paths = []
        self.labels = []
        self.transform = transform

        real_dir = os.path.join(root_dir, "real")
        fake_dir = os.path.join(root_dir, "fake")

        if os.path.exists(real_dir):
            for fname in os.listdir(real_dir):
                if fname.lower().endswith(('.jpg', '.jpeg', '.png')):
                    self.image_paths.append(os.path.join(real_dir, fname))
                    self.labels.append(0.0)  # Authentic = 0.0

        if os.path.exists(fake_dir):
            for fname in os.listdir(fake_dir):
                if fname.lower().endswith(('.jpg', '.jpeg', '.png')):
                    self.image_paths.append(os.path.join(fake_dir, fname))
                    self.labels.append(1.0)  # Manipulated = 1.0

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        image = Image.open(img_path).convert("RGB")
        label = self.labels[idx]

        if self.transform:
            image = self.transform(image)

        return image, torch.tensor(label, dtype=torch.float32)


def get_transforms() -> Tuple[transforms.Compose, transforms.Compose]:
    """
    Data augmentation simulating video compression, downscaling, and lighting changes.
    """
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    return train_transform, val_transform


def build_model() -> nn.Module:
    """
    Builds EfficientNet-B0 adapted for binary classification.
    """
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, 1)
    )
    return model


def train_epoch(model, dataloader, criterion, optimizer, device):
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for images, labels in dataloader:
        images = images.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()
        outputs = model(images).squeeze(-1)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * images.size(0)
        preds = (torch.sigmoid(outputs) >= 0.5).float()
        correct += (preds == labels).sum().item()
        total += labels.size(0)

    return total_loss / total, correct / total


def evaluate(model, dataloader, criterion, device):
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in dataloader:
            images = images.to(device)
            labels = labels.to(device)

            outputs = model(images).squeeze(-1)
            loss = criterion(outputs, labels)

            total_loss += loss.item() * images.size(0)
            preds = (torch.sigmoid(outputs) >= 0.5).float()
            correct += (preds == labels).sum().item()
            total += labels.size(0)

    return total_loss / total, correct / total


def main():
    parser = argparse.ArgumentParser(description="DeepShield Colab Training Pipeline")
    parser.add_argument("--data_dir", type=str, default="./data", help="Root data folder containing train/ and val/")
    parser.add_argument("--output_path", type=str, default="./efficientnet_b0_deepshield.pth")
    parser.add_argument("--epochs_stage1", type=int, default=3, help="Frozen backbone epochs")
    parser.add_argument("--epochs_stage2", type=int, default=5, help="Full fine-tuning epochs")
    parser.add_argument("--batch_size", type=int, default=32)
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[DeepShield] Training on device: {device}")

    train_tf, val_tf = get_transforms()
    train_dataset = FaceCropDataset(os.path.join(args.data_dir, "train"), transform=train_tf)
    val_dataset = FaceCropDataset(os.path.join(args.data_dir, "val"), transform=val_tf)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=2)

    model = build_model().to(device)
    criterion = nn.BCEWithLogitsLoss()

    # --- STAGE 1: Train Head Only (Backbone Frozen) ---
    print("\n--- STAGE 1: Training Head Only (Backbone Frozen) ---")
    for param in model.features.parameters():
        param.requires_grad = False

    optimizer_head = torch.optim.Adam(model.classifier.parameters(), lr=1e-3)
    for epoch in range(args.epochs_stage1):
        loss, acc = train_epoch(model, train_loader, criterion, optimizer_head, device)
        val_loss, val_acc = evaluate(model, val_loader, criterion, device)
        print(f"Epoch {epoch+1}/{args.epochs_stage1} | Train Loss: {loss:.4f}, Acc: {acc:.3f} | Val Loss: {val_loss:.4f}, Acc: {val_acc:.3f}")

    # --- STAGE 2: Full Fine-Tuning ---
    print("\n--- STAGE 2: Full Network Fine-Tuning ---")
    for param in model.features.parameters():
        param.requires_grad = True

    optimizer_full = torch.optim.Adam(model.parameters(), lr=2e-5)
    best_val_loss = float('inf')

    for epoch in range(args.epochs_stage2):
        loss, acc = train_epoch(model, train_loader, criterion, optimizer_full, device)
        val_loss, val_acc = evaluate(model, val_loader, criterion, device)
        print(f"Epoch {epoch+1}/{args.epochs_stage2} | Train Loss: {loss:.4f}, Acc: {acc:.3f} | Val Loss: {val_loss:.4f}, Acc: {val_acc:.3f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), args.output_path)
            print(f"[*] Checkpoint saved to: {args.output_path}")

    print("\n[DeepShield] Training complete. Download the .pth checkpoint and load into backend!")


if __name__ == "__main__":
    main()
