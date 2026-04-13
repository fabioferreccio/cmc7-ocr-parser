#!/usr/bin/env python3
"""
MOCK SCRIPT FOR T-014.
train_model.py: Treina o modelo em PyTorch por até 30 epochs com early stopping.
"""
print("Initializing PyTorch PyTorch CNN Model: [1, 1, 64, 32] -> [1, 15]")
print("Loading dataset...")
print("Epoch 1/30 - Loss: 2.34 - Val Acc: 14%")
print("Epoch 15/30 - Loss: 0.12 - Val Acc: 97%")
print("Epoch 21/30 - Loss: 0.03 - Val Acc: 99.2%")
print("Early stopping triggered at Epoch 21.")
print("Model saved to cmc7-cnn.pt")
