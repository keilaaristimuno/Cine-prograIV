import { Directive, input } from '@angular/core';
import { TipoButaca } from '../../core/modelos/butaca';

/**
 * Directiva personalizada para representar visualmente el TIPO de butaca
 * física en la sala ('normal' | 'accesible' | 'vip').
 *
 * Responsabilidad exclusiva: presentación visual y accesibilidad.
 * - 'normal': estilo estándar de butaca cinematográfica neutra.
 * - 'accesible': AZUL CLARO (#38bdf8 / cyan suave), con distinción accesible.
 * - 'vip': DORADO (#f5c451 / gold cálido), filas preferenciales posteriores.
 *
 * La lógica de negocio depende estrictamente de Butaca.tipo; la directiva
 * aplica únicamente las clases y atributos de presentación visual correspondientes.
 */
@Directive({
  selector: '[appTipoButaca]',
  host: {
    '[class.butaca-tipo--normal]': 'tipo() === "normal"',
    '[class.butaca-tipo--accesible]': 'tipo() === "accesible"',
    '[class.butaca-tipo--vip]': 'tipo() === "vip"',
    '[attr.data-tipo-butaca]': 'tipo()'
  }
})
export class TipoButacaDirective {
  /**
   * Tipo de butaca recibido como entrada.
   * Admite enlace de propiedad [appTipoButaca]="butaca.tipo" o atributo fijo appTipoButaca="normal".
   */
  readonly tipo = input<TipoButaca>('normal', { alias: 'appTipoButaca' });
}
