import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Actividad } from 'src/app/clases/actividad';
import { Juego } from 'src/app/clases/juego';
import { ControladorJuegosService } from 'src/app/servicios/controlador-juegos.service';

import { webSocket } from "rxjs/webSocket";
import { JActividad } from 'src/app/clases/j-actividad';

@Component({
  selector: 'app-sala',
  templateUrl: './sala.component.html',
  styleUrls: ['./sala.component.css']
})
export class SalaComponent implements OnInit{
  linksala: string | undefined
  enSala:boolean = false
  SalasActivas : Juego[] = []
  SalaActiva: Juego = new Juego
  Actividades : Actividad[] = []
  empezo: boolean = false
  contador = 0;
  Puntaje: number[] = []
  MayorPuntaje: number = 0;

  subject = webSocket(this.controlador.getip());  //cambiar esto al websocket
  mensajes: string[] = []
  mensajesviejos: string[] = []
  MayorPuntajeAct: Actividad  = {id: 0, titulo : "", descripcion: "", imagen: "" }

  constructor(private controlador:ControladorJuegosService, private router: Router, private route:ActivatedRoute){}

  async ingresar(codigo: string) {
    let nombreSala: Juego = { "isOpen": undefined, "nombre": undefined, "actividades": undefined}
    await new Promise<void>((resolve) => {
      this.controlador.getJuego(codigo).subscribe(res => {
        nombreSala = res;  
        resolve();
      });
    });
  
    if (nombreSala.nombre != undefined) {
      let string = "Usuario entro a la sala: " + nombreSala.nombre;
      this.subject.next(string);
      this.router.navigate(['sala', nombreSala.nombre]);
    } else {
      // Manejo de caso cuando no se encuentra el juego con el código especificado
      alert("Sala no encontrada")
      console.log("Juego no encontrado");
    }
  }

  ngOnInit(){

    this.subject.subscribe({
      next: message => {
      this.mensajes.push(JSON.stringify(message))
      this.mirar()
      }, 
      error: error => {
      console.log(error);
      }
    });


    this.linksala = this.route.snapshot.params['link'];
    if(this.linksala != undefined){
      this.enSala = true;
      this.controlador.getJuego(this.linksala).subscribe(res => {
        this.SalaActiva = res;
      });
    }
  }

  mirar() {
    if (this.mensajes != this.mensajesviejos) {
      this.onVariableChange();
      this.mensajesviejos = Object.assign({}, this.mensajes);
      return(true)
    } else {
      return(false)
    }
  }

  onVariableChange() {
    let last: any = this.mensajes[this.mensajes.length - 1];
    if (last == `{"message":"Admin inicio la sala:${this.SalaActiva.nombre}"}`) {
      this.empezo = true;
      if (this.SalaActiva.actividades != null) {
        this.controlador.obtenerActividadesPorIds(this.SalaActiva.actividades)
          .then((actividades: Actividad[]) => {
            this.Actividades = actividades;
            let largo = this.Actividades.length;
            for (let i = 0; i < largo; i++) {
              this.Puntaje.push(0);
            }
            this.contador = 0;
            this.timer(30);
          });
      }
    } else {
      //console.log("fallo", last, " es distinto de ",`{"message":"Admin inicio la sala:${this.SalaActiva.nombre}"}` )
    }
  }

  Envio = false

  async mayorPuntaje(nombre: string | undefined){
    let Conjunto: JActividad[] = []

    await new Promise<void>((resolve) => {
      this.controlador.obtenervotos(nombre).subscribe(res => {
        Conjunto = res;
        resolve();
      });
    });

    //recorrer el conjunto 
    let Resultado : JActividad = Conjunto[0]
    for (let Elemento of Conjunto) {
      if (Elemento.votos_positivos !== undefined && Elemento.votos_negativos !== undefined && Resultado.votos_positivos !== undefined && Resultado.votos_negativos !== undefined ) {
        if ((Elemento.votos_positivos - Elemento.votos_negativos) > (Resultado.votos_positivos - Resultado.votos_negativos)) {
          Resultado = Elemento
        }
      }
    }
    if (Resultado.id_actividad != undefined) {
      console.log("algo1234", Resultado.votos_positivos)
      if (Resultado.votos_positivos != undefined && Resultado.votos_negativos != undefined){
        this.MayorPuntaje = Resultado.votos_positivos - Resultado.votos_negativos
        console.log(Resultado.votos_positivos)
        console.log(Resultado.votos_negativos)
        console.log(this.MayorPuntaje)
      }
      console.log("algo1", Resultado.id_actividad)
      return this.Actividades.filter(p => p.id == Resultado.id_actividad)[0]
    } else {
      return this.Actividades[0]
    }
  }


  votarMegusta(id : number | undefined){
    this.timer(30);
    this.Puntaje[this.contador] = this.Puntaje[this.contador] + 1
    this.contador = this.contador + 1

    //votar me gusta
    this.controlador.votar(id, 1, this.SalaActiva.nombre).subscribe(res => {
    });

    setTimeout(()=> { 
      if (this.contador = this.Actividades.length){
      this.mayorPuntaje(this.SalaActiva.nombre)
      .then((actividades: Actividad) => {
        this.MayorPuntajeAct = actividades;
        console.log(this.MayorPuntajeAct)
      });
    }}, 2000)

   
  }

  votarMedaigual(id : number | undefined){
    this.timer(30);
    this.contador = this.contador + 1

    this.controlador.votar(id, 0, this.SalaActiva.nombre).subscribe(res => {
    });

    setTimeout(()=> { 
      if (this.contador = this.Actividades.length){
      this.mayorPuntaje(this.SalaActiva.nombre)
      .then((actividades: Actividad) => {
        this.MayorPuntajeAct = actividades;
        console.log(this.MayorPuntajeAct)
      });
    }}, 2000)
  }

  votarNoMegusta(id : number | undefined){
    this.timer(30);
    this.Puntaje[this.contador] = this.Puntaje[this.contador] - 1
    this.contador = this.contador + 1

    this.controlador.votar(id, -1, this.SalaActiva.nombre).subscribe(res => {
    });

    setTimeout(()=> { 
      if (this.contador = this.Actividades.length){
      this.mayorPuntaje(this.SalaActiva.nombre)
      .then((actividades: Actividad) => {
        this.MayorPuntajeAct = actividades;
        console.log(this.MayorPuntajeAct)
      });
    }}, 2000)
  }


  display: any;

  timer(segundos: number) {
    // let minute = 1;
    let seconds: number =  segundos; //minute * 60;
    let textSec: any = "0";
    let statSec: number = segundos;

    //const prefix = minute < 10 ? "0" : "";

    const timer = setInterval(() => {
      seconds--;
      if (statSec != 0) statSec--;
      else statSec = 59;

      if (statSec < 10) {
        textSec = statSec;          //"0" + 
      } else textSec = statSec;

      this.display = `${textSec}`; //${prefix}${Math.floor(seconds / 60)}:

      if (seconds == 0) {
        clearInterval(timer);
        if (this.contador < this.Actividades.length){
          this.votarMedaigual(this.contador);
        }
      }
    }, 1000);
  }
}