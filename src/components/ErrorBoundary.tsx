import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou um erro não tratado:', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center space-y-5 shadow-xl">
            <div className="inline-flex p-4 rounded-2xl bg-amber-500/10 text-amber-600">
              <AlertTriangle className="h-10 w-10 animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black text-foreground">
                Ops! Ocorreu um problema ao carregar
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Não conseguimos inicializar os dados desta página no seu navegador. Isso pode ocorrer por instabilidade temporária de rede ou limitações do dispositivo.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
