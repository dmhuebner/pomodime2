import { Component, OnInit } from '@angular/core';
import { TimerService } from '../../timer.service';
import {CompletedTimer} from '../../interfaces/CompletedTimer';

@Component({
  selector: 'pm-timer-history-container',
  templateUrl: './timer-history-container.component.html',
  styleUrls: ['./timer-history-container.component.scss']
})
export class TimerHistoryContainerComponent implements OnInit {

  onBreak = false;
  timerOn = false;
  timerHistoryList: CompletedTimer[] = [];

  constructor(private timerService: TimerService) { }

  ngOnInit() {
    this.timerService.onBreak$.subscribe(val => this.onBreak = val);
    this.timerService.timerOn$.subscribe(val => this.timerOn = val);
    this.timerService.completedTimerList$.subscribe(val => {
      if (val) {
        console.log('val', val);
        console.log(this.timerHistoryList);
        this.timerHistoryList.unshift(JSON.parse(JSON.stringify(val)));
      }
    });
  }

}