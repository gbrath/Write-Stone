import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {RouterModule} from "@angular/router";
import {FlexLayoutModule} from "@angular/flex-layout";
import {FC_PIPES} from "./pipes/index";
import {SHARED_COMPONENTS, SHARED_DIALOGS} from "./components/index";
import {SHARED_DIRECTIVES} from "./directives/index";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {SharedMaterialModule} from "./SharedMaterialModule";


@NgModule({
    imports: [
        CommonModule,
        FlexLayoutModule,
        SharedMaterialModule,
        RouterModule
    ],
    exports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        FlexLayoutModule,
        SharedMaterialModule,
        FC_PIPES,
        SHARED_COMPONENTS,
        SHARED_DIRECTIVES
    ],
    entryComponents: [SHARED_DIALOGS],
    declarations: [FC_PIPES, SHARED_COMPONENTS]
})

export class SharedModule {
}