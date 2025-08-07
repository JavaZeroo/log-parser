export const METRIC_PRESETS = [
  { label: 'Generic/Loss', name: 'Loss', mode: 'keyword', keyword: 'loss:' },
  { label: 'Generic/Grad Norm', name: 'Grad Norm', mode: 'keyword', keyword: 'norm:' },
  { label: 'Generic/Accuracy', name: 'Accuracy', mode: 'keyword', keyword: 'acc:' },
  { label: 'Generic/Learning Rate', name: 'Learning Rate', mode: 'keyword', keyword: 'lr:' },

  { label: 'PyTorch/Train Loss', name: 'Train Loss', mode: 'keyword', keyword: 'train_loss' },
  { label: 'PyTorch/Val Loss', name: 'Val Loss', mode: 'keyword', keyword: 'val_loss' },
  { label: 'PyTorch/Val Acc', name: 'Val Acc', mode: 'keyword', keyword: 'val_acc' },

  { label: 'HuggingFace/Eval Loss', name: 'Eval Loss', mode: 'keyword', keyword: 'eval_loss' },
  { label: 'HuggingFace/Eval Accuracy', name: 'Eval Accuracy', mode: 'keyword', keyword: 'eval_accuracy' },

  { label: 'Keras/MAE', name: 'MAE', mode: 'keyword', keyword: 'mae:' },
  { label: 'Keras/MSE', name: 'MSE', mode: 'keyword', keyword: 'mse:' },
];
